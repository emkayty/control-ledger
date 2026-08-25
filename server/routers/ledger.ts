import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import {
  accountingPeriodDecisions,
  accountingPeriods,
  auditEvents,
  branches,
  economicEvents,
  idempotencyKeys,
  invoices,
  ledgerAccounts,
  ledgerJournalDecisions,
  ledgerJournalLines,
  ledgerJournals,
} from "../../drizzle/schema";
import { permissions, requireScopedMembership } from "../control/access";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const scopeInput = z.object({ organisationId: z.string().uuid(), branchId: z.string().uuid() });
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date in YYYY-MM-DD format.");
const journalListInput = scopeInput.extend({ fromDate: dateOnly.optional(), toDate: dateOnly.optional() }).superRefine((input, ctx) => {
  if (input.fromDate && input.toDate && input.fromDate > input.toDate) ctx.addIssue({ code: "custom", message: "The end date must be on or after the start date.", path: ["toDate"] });
});
const idempotencyInput = z.object({ idempotencyKey: z.string().min(8).max(128) });
const recordId = () => crypto.randomUUID();
const correlation = () => crypto.randomUUID();
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const ZERO = BigInt(0);
const nonNegativeMinor = z.string().regex(/^\d+$/, "Use exact minor units without decimals.");
const positiveMinor = nonNegativeMinor.refine(value => BigInt(value) > ZERO, "Value must be positive.");
const currencyInput = z.string().length(3).transform(value => value.toUpperCase());
const journalLineInput = z.object({
  accountId: z.string().uuid(),
  debitMinor: nonNegativeMinor.default("0"),
  creditMinor: nonNegativeMinor.default("0"),
  memo: z.string().max(500).optional(),
}).superRefine((line, ctx) => {
  const debit = BigInt(line.debitMinor); const credit = BigInt(line.creditMinor);
  if ((debit === ZERO && credit === ZERO) || (debit > ZERO && credit > ZERO)) ctx.addIssue({ code: "custom", message: "Each journal line must contain one positive debit or one positive credit." });
});

function assertBalanced(lines: Array<{ debitMinor: string; creditMinor: string }>) {
  if (lines.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "A journal needs at least two lines." });
  const debit = lines.reduce((total, line) => total + BigInt(line.debitMinor), ZERO);
  const credit = lines.reduce((total, line) => total + BigInt(line.creditMinor), ZERO);
  if (debit <= ZERO || debit !== credit) throw new TRPCError({ code: "BAD_REQUEST", message: "Journal debits and credits must balance exactly before posting." });
  return debit;
}

export const ledgerMath = { assertBalanced };

export function journalPreparedAtRange(input: { fromDate?: string; toDate?: string }) {
  return {
    from: input.fromDate ? new Date(`${input.fromDate}T00:00:00.000Z`) : undefined,
    to: input.toDate ? new Date(`${input.toDate}T23:59:59.999Z`) : undefined,
  };
}

const periodInput = scopeInput.extend({ periodName: z.string().min(2).max(96), startsOn: dateOnly, endsOn: dateOnly }).superRefine((input, ctx) => {
  if (input.startsOn > input.endsOn) ctx.addIssue({ code: "custom", message: "The period end date must be on or after the start date.", path: ["endsOn"] });
});

export function accountingPeriodRange(input: { startsOn: string; endsOn: string }) {
  return { startsAt: new Date(`${input.startsOn}T00:00:00.000Z`), endsAt: new Date(`${input.endsOn}T23:59:59.999Z`) };
}

async function scopedDb(input: { organisationId: string; branchId: string; userId: number; allowed: readonly any[] }) {
  await requireScopedMembership(input);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const [branch] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, input.branchId), eq(branches.organisationId, input.organisationId), eq(branches.isActive, 1))).limit(1);
  if (!branch) throw new TRPCError({ code: "NOT_FOUND", message: "The selected branch is not active in this organisation." });
  return db;
}

async function writeAudit(transaction: { insert: any }, input: { organisationId: string; branchId: string; actorUserId: number; action: string; entityType: string; entityId: string; correlationId: string; metadata?: Record<string, unknown> }) {
  await transaction.insert(auditEvents).values({ id: recordId(), ...input });
}

async function idempotent(input: { organisationId: string; userId: number; action: string; idempotencyKey: string; request: unknown; execute: () => Promise<{ entityId: string; correlationId: string }> }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const requestHash = hash(input.request);
  const [existing] = await db.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.organisationId, input.organisationId), eq(idempotencyKeys.actorUserId, input.userId), eq(idempotencyKeys.action, input.action), eq(idempotencyKeys.idempotencyKey, input.idempotencyKey))).limit(1);
  if (existing) {
    if (existing.requestHash !== requestHash) throw new TRPCError({ code: "CONFLICT", message: "This idempotency key was used for a different request." });
    const cached = existing.responseMetadata as { entityId: string; correlationId: string } | null;
    if (!cached) throw new TRPCError({ code: "CONFLICT", message: "This material action is still being processed." });
    return { ...cached, replayed: true };
  }
  const id = recordId();
  try {
    await db.insert(idempotencyKeys).values({ id, organisationId: input.organisationId, actorUserId: input.userId, action: input.action, idempotencyKey: input.idempotencyKey, requestHash });
  } catch {
    throw new TRPCError({ code: "CONFLICT", message: "This material action is already being processed." });
  }
  try {
    const result = await input.execute();
    await db.update(idempotencyKeys).set({ responseMetadata: result }).where(eq(idempotencyKeys.id, id));
    return { ...result, replayed: false };
  } catch (error) {
    await db.delete(idempotencyKeys).where(eq(idempotencyKeys.id, id));
    throw error;
  }
}

async function assertActiveAccounts(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: { organisationId: string; accountIds: string[] }) {
  const accounts = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.organisationId, input.organisationId));
  const byId = new Map(accounts.map(account => [account.id, account]));
  if (input.accountIds.some(id => !byId.get(id)?.isActive)) throw new TRPCError({ code: "BAD_REQUEST", message: "Every journal account must be active and belong to this organisation." });
  return byId;
}

async function resolveOpenPeriod(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: { organisationId: string; branchId: string; effectiveAt: Date }) {
  const periods = await db.select().from(accountingPeriods).where(and(eq(accountingPeriods.organisationId, input.organisationId), eq(accountingPeriods.branchId, input.branchId)));
  if (!periods.length) return null;
  const period = periods.find(item => item.status === "open" && item.startsAt.getTime() <= input.effectiveAt.getTime() && item.endsAt.getTime() >= input.effectiveAt.getTime());
  if (!period) throw new TRPCError({ code: "BAD_REQUEST", message: "This branch has configured accounting periods, but the journal date is not in an open period." });
  return period.id;
}

async function readyJournalCountForPeriod(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: { organisationId: string; branchId: string; periodId: string; startsAt: Date; endsAt: Date }) {
  const readyJournals = await db.select().from(ledgerJournals).where(and(eq(ledgerJournals.organisationId, input.organisationId), eq(ledgerJournals.branchId, input.branchId), eq(ledgerJournals.status, "ready")));
  return readyJournals.filter(journal => journal.periodId === input.periodId || (journal.preparedAt.getTime() >= input.startsAt.getTime() && journal.preparedAt.getTime() <= input.endsAt.getTime())).length;
}

function journalWithLines(journals: any[], lines: any[], decisions: any[]) {
  return journals.map(journal => ({
    ...journal,
    lines: lines.filter(line => line.journalId === journal.id),
    decisions: decisions.filter(decision => decision.journalId === journal.id),
  }));
}

export const ledgerRouter = router({
  periods: router({
    list: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const [periods, decisions] = await Promise.all([
        db.select().from(accountingPeriods).where(and(eq(accountingPeriods.organisationId, input.organisationId), eq(accountingPeriods.branchId, input.branchId))).orderBy(desc(accountingPeriods.startsAt)),
        db.select().from(accountingPeriodDecisions).where(and(eq(accountingPeriodDecisions.organisationId, input.organisationId), eq(accountingPeriodDecisions.branchId, input.branchId))).orderBy(desc(accountingPeriodDecisions.createdAt)),
      ]);
      return periods.map(period => ({ ...period, decisions: decisions.filter(decision => decision.periodId === period.id) }));
    }),
    create: protectedProcedure.input(periodInput.merge(idempotencyInput).extend({ rationale: z.string().min(4).max(4000) })).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageAccountingPeriods });
      const range = accountingPeriodRange(input);
      const existing = await db.select().from(accountingPeriods).where(and(eq(accountingPeriods.organisationId, input.organisationId), eq(accountingPeriods.branchId, input.branchId)));
      if (existing.some(period => range.startsAt.getTime() <= period.endsAt.getTime() && range.endsAt.getTime() >= period.startsAt.getTime())) throw new TRPCError({ code: "CONFLICT", message: "Accounting periods may not overlap in the same branch." });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release4.accounting_period.create", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const correlationId = correlation(); const periodName = input.periodName.trim();
        await db.transaction(async transaction => {
          await transaction.insert(accountingPeriods).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, periodName, ...range, status: "open", correlationId, createdByUserId: ctx.user.id });
          await transaction.insert(accountingPeriodDecisions).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, periodId: entityId, decision: "created", rationale: input.rationale.trim(), correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release4.accounting_period_created", entityType: "accounting_period", entityId, correlationId, metadata: { periodName, startsOn: input.startsOn, endsOn: input.endsOn } });
        });
        return { entityId, correlationId };
      }});
    }),
    requestClose: protectedProcedure.input(scopeInput.extend({ periodId: z.string().uuid(), rationale: z.string().min(4).max(4000) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.requestPeriodClose });
      const [period] = await db.select().from(accountingPeriods).where(and(eq(accountingPeriods.id, input.periodId), eq(accountingPeriods.organisationId, input.organisationId), eq(accountingPeriods.branchId, input.branchId))).limit(1);
      if (!period || period.status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "Only an open accounting period can be submitted for independent close." });
      const readyCount = await readyJournalCountForPeriod(db, { organisationId: input.organisationId, branchId: input.branchId, periodId: period.id, startsAt: period.startsAt, endsAt: period.endsAt });
      if (readyCount) throw new TRPCError({ code: "BAD_REQUEST", message: `Post, reverse, or otherwise resolve the ${readyCount} ready journal${readyCount === 1 ? "" : "s"} in this period before requesting close.` });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release4.accounting_period.close_request", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const correlationId = correlation();
        await db.transaction(async transaction => {
          const result = await transaction.update(accountingPeriods).set({ status: "close_requested", closeRequestedByUserId: ctx.user.id, closeRequestedAt: new Date() }).where(and(eq(accountingPeriods.id, period.id), eq(accountingPeriods.status, "open")));
          if ((result as unknown as { affectedRows?: number }).affectedRows !== 1) throw new TRPCError({ code: "CONFLICT", message: "This accounting period was updated by another authorised user." });
          await transaction.insert(accountingPeriodDecisions).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, periodId: period.id, decision: "close_requested", rationale: input.rationale.trim(), correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release4.accounting_period_close_requested", entityType: "accounting_period", entityId: period.id, correlationId, metadata: { readyJournalCount: readyCount } });
        });
        return { entityId: period.id, correlationId };
      }});
    }),
    decideClose: protectedProcedure.input(scopeInput.extend({ periodId: z.string().uuid(), decision: z.enum(["approve", "reject"]), rationale: z.string().min(4).max(4000) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.decidePeriodClose });
      const [period] = await db.select().from(accountingPeriods).where(and(eq(accountingPeriods.id, input.periodId), eq(accountingPeriods.organisationId, input.organisationId), eq(accountingPeriods.branchId, input.branchId))).limit(1);
      if (!period || period.status !== "close_requested" || !period.closeRequestedByUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "Only a pending accounting-period close request can be decided." });
      if (period.closeRequestedByUserId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "The person who requested period close cannot decide it." });
      const readyCount = input.decision === "approve" ? await readyJournalCountForPeriod(db, { organisationId: input.organisationId, branchId: input.branchId, periodId: period.id, startsAt: period.startsAt, endsAt: period.endsAt }) : 0;
      if (readyCount) throw new TRPCError({ code: "BAD_REQUEST", message: `A ready journal appeared in this period. Close it only after the ${readyCount} ready journal${readyCount === 1 ? "" : "s"} is resolved.` });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: `release4.accounting_period.close_${input.decision}`, idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const correlationId = correlation(); const approve = input.decision === "approve";
        await db.transaction(async transaction => {
          const result = await transaction.update(accountingPeriods).set(approve ? { status: "closed", closedByUserId: ctx.user.id, closedAt: new Date() } : { status: "open", closeRequestedByUserId: null, closeRequestedAt: null }).where(and(eq(accountingPeriods.id, period.id), eq(accountingPeriods.status, "close_requested")));
          if ((result as unknown as { affectedRows?: number }).affectedRows !== 1) throw new TRPCError({ code: "CONFLICT", message: "This accounting period was already decided by another authorised reviewer." });
          await transaction.insert(accountingPeriodDecisions).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, periodId: period.id, decision: approve ? "close_approved" : "close_rejected", rationale: input.rationale.trim(), correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: approve ? "release4.accounting_period_closed" : "release4.accounting_period_close_rejected", entityType: "accounting_period", entityId: period.id, correlationId, metadata: { readyJournalCount: readyCount } });
        });
        return { entityId: period.id, correlationId };
      }});
    }),
  }),
  accounts: router({
    list: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      return db.select().from(ledgerAccounts).where(eq(ledgerAccounts.organisationId, input.organisationId)).orderBy(ledgerAccounts.code);
    }),
    create: protectedProcedure.input(scopeInput.extend({ code: z.string().min(2).max(32), name: z.string().min(2).max(160), accountClass: z.enum(["asset", "liability", "equity", "revenue", "expense"]), normalBalance: z.enum(["debit", "credit"]) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageLedgerAccounts });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release3.ledger.account.create", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const correlationId = correlation(); const code = input.code.trim().toUpperCase();
        await db.transaction(async transaction => {
          await transaction.insert(ledgerAccounts).values({ id: entityId, organisationId: input.organisationId, code, name: input.name.trim(), accountClass: input.accountClass, normalBalance: input.normalBalance, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release3.ledger_account_created", entityType: "ledger_account", entityId, correlationId, metadata: { code, accountClass: input.accountClass, normalBalance: input.normalBalance } });
        });
        return { entityId, correlationId };
      }});
    }),
    balances: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const [accounts, journals, lines] = await Promise.all([
        db.select().from(ledgerAccounts).where(eq(ledgerAccounts.organisationId, input.organisationId)),
        db.select().from(ledgerJournals).where(and(eq(ledgerJournals.organisationId, input.organisationId), eq(ledgerJournals.branchId, input.branchId), eq(ledgerJournals.status, "posted"))),
        db.select().from(ledgerJournalLines).where(and(eq(ledgerJournalLines.organisationId, input.organisationId), eq(ledgerJournalLines.branchId, input.branchId))),
      ]);
      const postedJournalIds = new Set(journals.map(journal => journal.id));
      const accountById = new Map(accounts.map(account => [account.id, account]));
      const balances = new Map<string, { accountId: string; accountCode: string; accountName: string; accountClass: string; currency: string; debit: bigint; credit: bigint; normalBalance: string }>();
      lines.filter(line => postedJournalIds.has(line.journalId)).forEach(line => {
        const account = accountById.get(line.accountId); if (!account) return;
        const key = `${line.accountId}:${line.currency}`; const current = balances.get(key) ?? { accountId: account.id, accountCode: account.code, accountName: account.name, accountClass: account.accountClass, currency: line.currency, debit: ZERO, credit: ZERO, normalBalance: account.normalBalance };
        current.debit += BigInt(String(line.debitMinor)); current.credit += BigInt(String(line.creditMinor)); balances.set(key, current);
      });
      return Array.from(balances.values()).map(balance => ({ ...balance, debitMinor: balance.debit.toString(), creditMinor: balance.credit.toString(), balanceMinor: (balance.normalBalance === "debit" ? balance.debit - balance.credit : balance.credit - balance.debit).toString() })).sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    }),
  }),
  journals: router({
    list: protectedProcedure.input(journalListInput).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const range = journalPreparedAtRange(input);
      const journalConditions = [eq(ledgerJournals.organisationId, input.organisationId), eq(ledgerJournals.branchId, input.branchId)];
      if (range.from) journalConditions.push(gte(ledgerJournals.preparedAt, range.from));
      if (range.to) journalConditions.push(lte(ledgerJournals.preparedAt, range.to));
      const [journals, lines, decisions] = await Promise.all([
        db.select().from(ledgerJournals).where(and(...journalConditions)).orderBy(desc(ledgerJournals.preparedAt)),
        db.select().from(ledgerJournalLines).where(and(eq(ledgerJournalLines.organisationId, input.organisationId), eq(ledgerJournalLines.branchId, input.branchId))),
        db.select().from(ledgerJournalDecisions).where(and(eq(ledgerJournalDecisions.organisationId, input.organisationId), eq(ledgerJournalDecisions.branchId, input.branchId))).orderBy(desc(ledgerJournalDecisions.createdAt)),
      ]);
      return journalWithLines(journals, lines, decisions);
    }),
    prepareInvoice: protectedProcedure.input(scopeInput.extend({ invoiceId: z.string().uuid(), debitAccountId: z.string().uuid(), creditAccountId: z.string().uuid(), memo: z.string().min(4).max(500), rationale: z.string().min(4).max(4000) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      if (input.debitAccountId === input.creditAccountId) throw new TRPCError({ code: "BAD_REQUEST", message: "Use different debit and credit accounts for an invoice journal." });
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.prepareLedgerJournal });
      const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, input.invoiceId), eq(invoices.organisationId, input.organisationId), eq(invoices.branchId, input.branchId), eq(invoices.status, "issued"))).limit(1);
      if (!invoice || BigInt(String(invoice.amountMinor)) <= ZERO) throw new TRPCError({ code: "NOT_FOUND", message: "An issued positive-value invoice in the selected branch is required." });
      const periodId = await resolveOpenPeriod(db, { organisationId: input.organisationId, branchId: input.branchId, effectiveAt: invoice.issuedAt });
      await assertActiveAccounts(db, { organisationId: input.organisationId, accountIds: [input.debitAccountId, input.creditAccountId] });
      const [existing] = await db.select({ id: economicEvents.id }).from(economicEvents).where(and(eq(economicEvents.organisationId, input.organisationId), eq(economicEvents.eventType, "invoice_receivable_recognition"), eq(economicEvents.sourceType, "invoice"), eq(economicEvents.sourceId, invoice.id))).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "This invoice already has a Release 3 ledger event. Use the existing journal or prepare an explicit reversal." });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release3.ledger.invoice.prepare", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const eventId = recordId(); const correlationId = correlation(); const amountMinor = String(invoice.amountMinor);
        await db.transaction(async transaction => {
          await transaction.insert(economicEvents).values({ id: eventId, organisationId: input.organisationId, branchId: input.branchId, eventType: "invoice_receivable_recognition", status: "ready_to_post", sourceType: "invoice", sourceId: invoice.id, sourceReference: invoice.invoiceNumber, payload: { invoiceId: invoice.id, obligationId: invoice.obligationId, customerId: invoice.customerId, amountMinor, currency: invoice.currency }, occurredAt: invoice.issuedAt, actorUserId: ctx.user.id, correlationId });
          await transaction.insert(ledgerJournals).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, economicEventId: eventId, periodId, sourceType: "invoice", sourceId: invoice.id, sourceReference: invoice.invoiceNumber, status: "ready", currency: invoice.currency, memo: input.memo.trim(), preparedByUserId: ctx.user.id, correlationId });
          await transaction.insert(ledgerJournalLines).values([
            { id: recordId(), journalId: entityId, organisationId: input.organisationId, branchId: input.branchId, accountId: input.debitAccountId, debitMinor: amountMinor, creditMinor: "0", currency: invoice.currency, memo: input.memo.trim() },
            { id: recordId(), journalId: entityId, organisationId: input.organisationId, branchId: input.branchId, accountId: input.creditAccountId, debitMinor: "0", creditMinor: amountMinor, currency: invoice.currency, memo: input.memo.trim() },
          ]);
          await transaction.insert(ledgerJournalDecisions).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, journalId: entityId, decision: "prepared", rationale: input.rationale.trim(), correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release3.invoice_journal_prepared", entityType: "ledger_journal", entityId, correlationId, metadata: { invoiceId: invoice.id, eventId, debitAccountId: input.debitAccountId, creditAccountId: input.creditAccountId, amountMinor, currency: invoice.currency } });
        });
        return { entityId, correlationId };
      }});
    }),
    post: protectedProcedure.input(scopeInput.extend({ journalId: z.string().uuid(), rationale: z.string().min(4).max(4000) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.postLedgerJournal });
      const [journal] = await db.select().from(ledgerJournals).where(and(eq(ledgerJournals.id, input.journalId), eq(ledgerJournals.organisationId, input.organisationId), eq(ledgerJournals.branchId, input.branchId))).limit(1);
      if (!journal || journal.status !== "ready") throw new TRPCError({ code: "BAD_REQUEST", message: "Only a ready journal can be independently posted." });
      if (journal.preparedByUserId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "The journal preparer cannot post the same source-linked journal." });
      const lines = await db.select().from(ledgerJournalLines).where(eq(ledgerJournalLines.journalId, journal.id));
      if (lines.some(line => line.currency !== journal.currency)) throw new TRPCError({ code: "BAD_REQUEST", message: "Journal lines must use the journal currency." });
      assertBalanced(lines.map(line => ({ debitMinor: String(line.debitMinor), creditMinor: String(line.creditMinor) })));
      await assertActiveAccounts(db, { organisationId: input.organisationId, accountIds: lines.map(line => line.accountId) });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release3.ledger.journal.post", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const correlationId = correlation();
        await db.transaction(async transaction => {
          const result = await transaction.update(ledgerJournals).set({ status: "posted", postedAt: new Date(), postedByUserId: ctx.user.id }).where(and(eq(ledgerJournals.id, journal.id), eq(ledgerJournals.status, "ready")));
          const affectedRows = (result as unknown as { affectedRows?: number }).affectedRows;
          if (affectedRows !== 1) throw new TRPCError({ code: "CONFLICT", message: "This journal was already finalised by another authorised reviewer." });
          await transaction.update(economicEvents).set({ status: "posted" }).where(eq(economicEvents.id, journal.economicEventId));
          if (journal.reversalOfJournalId) {
            await transaction.update(ledgerJournals).set({ status: "reversed" }).where(and(eq(ledgerJournals.id, journal.reversalOfJournalId), eq(ledgerJournals.status, "posted")));
          }
          await transaction.insert(ledgerJournalDecisions).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, journalId: journal.id, decision: "posted", rationale: input.rationale.trim(), correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release3.ledger_journal_posted", entityType: "ledger_journal", entityId: journal.id, correlationId, metadata: { sourceType: journal.sourceType, sourceId: journal.sourceId, reversalOfJournalId: journal.reversalOfJournalId ?? null } });
        });
        return { entityId: journal.id, correlationId };
      }});
    }),
    prepareReversal: protectedProcedure.input(scopeInput.extend({ journalId: z.string().uuid(), memo: z.string().min(4).max(500), rationale: z.string().min(4).max(4000) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.prepareLedgerJournal });
      const [original] = await db.select().from(ledgerJournals).where(and(eq(ledgerJournals.id, input.journalId), eq(ledgerJournals.organisationId, input.organisationId), eq(ledgerJournals.branchId, input.branchId), eq(ledgerJournals.status, "posted"))).limit(1);
      if (!original) throw new TRPCError({ code: "NOT_FOUND", message: "Only a posted journal in the selected branch can be reversed." });
      const originalLines = await db.select().from(ledgerJournalLines).where(eq(ledgerJournalLines.journalId, original.id));
      assertBalanced(originalLines.map(line => ({ debitMinor: String(line.debitMinor), creditMinor: String(line.creditMinor) })));
      const periodId = await resolveOpenPeriod(db, { organisationId: input.organisationId, branchId: input.branchId, effectiveAt: new Date() });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release3.ledger.journal.reverse.prepare", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const eventId = recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(economicEvents).values({ id: eventId, organisationId: input.organisationId, branchId: input.branchId, eventType: "ledger_journal_reversal", status: "ready_to_post", sourceType: "ledger_journal", sourceId: original.id, sourceReference: original.sourceReference, causalEventId: original.economicEventId, payload: { reversalOfJournalId: original.id, sourceType: original.sourceType, sourceId: original.sourceId }, occurredAt: new Date(), actorUserId: ctx.user.id, correlationId });
          await transaction.insert(ledgerJournals).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, economicEventId: eventId, periodId, sourceType: "ledger_journal_reversal", sourceId: original.id, sourceReference: original.sourceReference, status: "ready", currency: original.currency, memo: input.memo.trim(), reversalOfJournalId: original.id, preparedByUserId: ctx.user.id, correlationId });
          await transaction.insert(ledgerJournalLines).values(originalLines.map(line => ({ id: recordId(), journalId: entityId, organisationId: input.organisationId, branchId: input.branchId, accountId: line.accountId, debitMinor: String(line.creditMinor), creditMinor: String(line.debitMinor), currency: original.currency, memo: input.memo.trim() })));
          await transaction.insert(ledgerJournalDecisions).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, journalId: entityId, decision: "reversed", rationale: input.rationale.trim(), correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release3.ledger_reversal_prepared", entityType: "ledger_journal", entityId, correlationId, metadata: { reversalOfJournalId: original.id, eventId } });
        });
        return { entityId, correlationId };
      }});
    }),
  }),
});
