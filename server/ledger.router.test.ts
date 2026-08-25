import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));

import { appRouter } from "./routers";
import { accountingPeriodRange, journalPreparedAtRange, ledgerMath } from "./routers/ledger";

type Recorded = Record<string, unknown>;

const organisationId = "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0";
const branchId = "f894a6a4-b488-48f1-9e45-dba4f4f9d9c3";
const invoiceId = "e2ed3bde-9321-463e-8229-2603f94812a4";
const debitAccountId = "ea35263e-172d-440e-8f73-2d8ad0eff556";
const creditAccountId = "c2101d7a-3e96-4c36-b75e-b22c2be1371b";
const journalId = "5d58f6f1-a811-4f08-8d6a-7c31cb80184d";

function authContext(userId = 1): TrpcContext {
  return { user: { id: userId, openId: `control-user-${userId}`, email: "owner@example.com", name: "Control User", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as TrpcContext["res"] };
}

function queuedDatabase(selections: unknown[][], affectedRows = 1) {
  const inserted: Recorded[] = [];
  const updates: Recorded[] = [];
  const executableRows = (rows: unknown[]) => {
    const query = Promise.resolve(rows) as Promise<unknown[]> & { limit: () => Promise<unknown[]>; orderBy: () => Promise<unknown[]> };
    query.limit = async () => rows;
    query.orderBy = async () => rows;
    return query;
  };
  const values = async (payload: Recorded | Recorded[]) => { if (Array.isArray(payload)) inserted.push(...payload); else inserted.push(payload); return { affectedRows: 1 }; };
  const update = () => ({ set: (payload: Recorded) => ({ where: async () => { updates.push(payload); return { affectedRows }; } }) });
  const database = {
    select: () => ({ from: () => ({ where: () => executableRows(selections.shift() ?? []) }) }),
    insert: () => ({ values }), update, delete: () => ({ where: async () => ({ affectedRows: 1 }) }),
    transaction: async (callback: (transaction: { insert: () => { values: typeof values }; update: typeof update }) => Promise<unknown>) => callback({ insert: () => ({ values }), update }),
  };
  return { database, inserted, updates };
}

describe("Release 3 ledger controls", () => {
  beforeEach(() => getDbMock.mockReset());

  it("requires exact balanced journal totals with positive debit and credit value", () => {
    expect(ledgerMath.assertBalanced([{ debitMinor: "250", creditMinor: "0" }, { debitMinor: "0", creditMinor: "250" }]).toString()).toBe("250");
    expect(() => ledgerMath.assertBalanced([{ debitMinor: "250", creditMinor: "0" }, { debitMinor: "0", creditMinor: "249" }])).toThrow("balance exactly");
  });

  it("converts a selected journal period into inclusive UTC day boundaries", () => {
    const range = journalPreparedAtRange({ fromDate: "2026-08-01", toDate: "2026-08-25" });
    expect(range.from?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(range.to?.toISOString()).toBe("2026-08-25T23:59:59.999Z");
  });

  it("converts an accounting period into inclusive UTC boundaries", () => {
    const range = accountingPeriodRange({ startsOn: "2026-08-01", endsOn: "2026-08-31" });
    expect(range.startsAt.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(range.endsAt.toISOString()).toBe("2026-08-31T23:59:59.999Z");
  });

  it("rejects an inverted journal date range before database access", async () => {
    await expect(appRouter.createCaller(authContext()).ledger.journals.list({ organisationId, branchId, fromDate: "2026-08-26", toDate: "2026-08-25" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("denies an operator chart-of-accounts access despite valid branch membership", async () => {
    const membership = [{ id: "operator-member", organisationId, userId: 1, branchId, role: "operator", isActive: 1 }];
    const { database, inserted } = queuedDatabase([membership]);
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(authContext()).ledger.accounts.create({ organisationId, branchId, code: "1100", name: "Trade receivables", accountClass: "asset", normalBalance: "debit", idempotencyKey: "release3-account-operator" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(inserted).toHaveLength(0);
  });

  it("denies an operator accounting-period configuration", async () => {
    const membership = [{ id: "operator-member", organisationId, userId: 1, branchId, role: "operator", isActive: 1 }];
    const { database, inserted } = queuedDatabase([membership]);
    getDbMock.mockResolvedValue(database);
    await expect(appRouter.createCaller(authContext()).ledger.periods.create({ organisationId, branchId, periodName: "August 2026", startsOn: "2026-08-01", endsOn: "2026-08-31", rationale: "Controlled monthly accounting window.", idempotencyKey: "release4-period-operator" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(inserted).toHaveLength(0);
  });

  it("prevents the period-close requester from deciding their own request", async () => {
    const membership = [{ id: "controller-member", organisationId, userId: 1, branchId, role: "controller", isActive: 1 }];
    const branch = [{ id: branchId, organisationId, isActive: 1 }];
    const period = [{ id: journalId, organisationId, branchId, status: "close_requested", closeRequestedByUserId: 1, startsAt: new Date("2026-08-01T00:00:00.000Z"), endsAt: new Date("2026-08-31T23:59:59.999Z") }];
    const { database, updates } = queuedDatabase([membership, branch, period]);
    getDbMock.mockResolvedValue(database);
    await expect(appRouter.createCaller(authContext()).ledger.periods.decideClose({ organisationId, branchId, periodId: journalId, decision: "approve", rationale: "Independent close review is required.", idempotencyKey: "release4-self-close" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updates).toHaveLength(0);
  });

  it("rejects an overlapping accounting period before any period decision is written", async () => {
    const membership = [{ id: "controller-member", organisationId, userId: 1, branchId, role: "controller", isActive: 1 }];
    const branch = [{ id: branchId, organisationId, isActive: 1 }];
    const existingPeriod = [{ id: journalId, organisationId, branchId, startsAt: new Date("2026-08-01T00:00:00.000Z"), endsAt: new Date("2026-08-31T23:59:59.999Z") }];
    const { database, inserted } = queuedDatabase([membership, branch, existingPeriod]);
    getDbMock.mockResolvedValue(database);
    await expect(appRouter.createCaller(authContext()).ledger.periods.create({ organisationId, branchId, periodName: "August overlap", startsOn: "2026-08-15", endsOn: "2026-09-15", rationale: "This intentionally overlaps for safety testing.", idempotencyKey: "release4-period-overlap" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(inserted).toHaveLength(0);
  });

  it("blocks a period-close request while a ready journal remains in its window", async () => {
    const membership = [{ id: "manager-member", organisationId, userId: 1, branchId, role: "manager", isActive: 1 }];
    const branch = [{ id: branchId, organisationId, isActive: 1 }];
    const period = [{ id: journalId, organisationId, branchId, status: "open", startsAt: new Date("2026-08-01T00:00:00.000Z"), endsAt: new Date("2026-08-31T23:59:59.999Z") }];
    const readyJournal = [{ id: invoiceId, organisationId, branchId, periodId: journalId, status: "ready", preparedAt: new Date("2026-08-20T10:00:00.000Z") }];
    const { database, updates } = queuedDatabase([membership, branch, period, readyJournal]);
    getDbMock.mockResolvedValue(database);
    await expect(appRouter.createCaller(authContext()).ledger.periods.requestClose({ organisationId, branchId, periodId: journalId, rationale: "Attempt to close while work remains.", idempotencyKey: "release4-close-ready-journal" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(updates).toHaveLength(0);
  });

  it("links a newly prepared invoice journal to the active configured period", async () => {
    const membership = [{ id: "manager-member", organisationId, userId: 1, branchId, role: "manager", isActive: 1 }];
    const branch = [{ id: branchId, organisationId, isActive: 1 }];
    const invoice = [{ id: invoiceId, organisationId, branchId, invoiceNumber: "INV-R4-500", obligationId: "obligation-r2", customerId: "customer-r2", amountMinor: "100000", currency: "NGN", issuedAt: new Date("2026-08-15T12:00:00.000Z"), status: "issued" }];
    const period = [{ id: journalId, organisationId, branchId, status: "open", startsAt: new Date("2026-08-01T00:00:00.000Z"), endsAt: new Date("2026-08-31T23:59:59.999Z") }];
    const accounts = [{ id: debitAccountId, organisationId, isActive: 1 }, { id: creditAccountId, organisationId, isActive: 1 }];
    const { database, inserted } = queuedDatabase([membership, branch, invoice, period, accounts, [], []]);
    getDbMock.mockResolvedValue(database);
    await appRouter.createCaller(authContext()).ledger.journals.prepareInvoice({ organisationId, branchId, invoiceId, debitAccountId, creditAccountId, memo: "Invoice recognition", rationale: "Recognise invoice receivable and revenue.", idempotencyKey: "release4-period-linked-journal" });
    expect(inserted.find(row => row.economicEventId !== undefined)).toMatchObject({ periodId: journalId, status: "ready" });
  });

  it("allows an independent authorised reviewer to close a period after ready journals are clear", async () => {
    const membership = [{ id: "approver-member", organisationId, userId: 2, branchId, role: "approver", isActive: 1 }];
    const branch = [{ id: branchId, organisationId, isActive: 1 }];
    const period = [{ id: journalId, organisationId, branchId, status: "close_requested", closeRequestedByUserId: 1, startsAt: new Date("2026-08-01T00:00:00.000Z"), endsAt: new Date("2026-08-31T23:59:59.999Z") }];
    const { database, inserted, updates } = queuedDatabase([membership, branch, period, [], []]);
    getDbMock.mockResolvedValue(database);
    const result = await appRouter.createCaller(authContext(2)).ledger.periods.decideClose({ organisationId, branchId, periodId: journalId, decision: "approve", rationale: "Ready journals cleared and independently reviewed.", idempotencyKey: "release4-independent-close" });
    expect(result.replayed).toBe(false);
    expect(updates).toEqual(expect.arrayContaining([expect.objectContaining({ status: "closed", closedByUserId: 2 })]));
    expect(inserted.some(row => row.decision === "close_approved" && row.periodId === journalId)).toBe(true);
  });

  it("prepares a source-linked, balanced invoice journal without changing the invoice or obligation", async () => {
    const membership = [{ id: "manager-member", organisationId, userId: 1, branchId, role: "manager", isActive: 1 }];
    const branch = [{ id: branchId, organisationId, isActive: 1 }];
    const invoice = [{ id: invoiceId, organisationId, branchId, invoiceNumber: "INV-R2-500", obligationId: "obligation-r2", customerId: "customer-r2", amountMinor: "100000", currency: "NGN", issuedAt: new Date(), status: "issued" }];
    const accounts = [{ id: debitAccountId, organisationId, isActive: 1 }, { id: creditAccountId, organisationId, isActive: 1 }];
    const { database, inserted } = queuedDatabase([membership, branch, invoice, [], accounts, [], []]);
    getDbMock.mockResolvedValue(database);

    const result = await appRouter.createCaller(authContext()).ledger.journals.prepareInvoice({ organisationId, branchId, invoiceId, debitAccountId, creditAccountId, memo: "Invoice recognition", rationale: "Recognise invoice receivable and revenue.", idempotencyKey: "release3-invoice-journal-1" });

    const event = inserted.find(row => row.eventType === "invoice_receivable_recognition");
    const journal = inserted.find(row => row.economicEventId === event?.id);
    const lines = inserted.filter(row => row.journalId === journal?.id);
    expect(result.replayed).toBe(false);
    expect(event).toMatchObject({ sourceType: "invoice", sourceId: invoiceId, status: "ready_to_post" });
    expect(journal).toMatchObject({ sourceType: "invoice", sourceId: invoiceId, status: "ready", currency: "NGN" });
    expect(lines).toEqual(expect.arrayContaining([expect.objectContaining({ debitMinor: "100000", creditMinor: "0" }), expect.objectContaining({ debitMinor: "0", creditMinor: "100000" })]));
    expect(inserted.some(row => row.id === "obligation-r2" || row.status === "settled")).toBe(false);
  });

  it("refuses self-posting before any journal state can be changed", async () => {
    const membership = [{ id: "controller-member", organisationId, userId: 1, branchId, role: "controller", isActive: 1 }];
    const branch = [{ id: branchId, organisationId, isActive: 1 }];
    const journal = [{ id: journalId, organisationId, branchId, status: "ready", preparedByUserId: 1 }];
    const { database, updates } = queuedDatabase([membership, branch, journal]);
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(authContext()).ledger.journals.post({ organisationId, branchId, journalId, rationale: "Independent approval is required.", idempotencyKey: "release3-self-post-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updates).toHaveLength(0);
  });

  it("allows an independent approver to post a balanced ready journal and its economic event", async () => {
    const membership = [{ id: "approver-member", organisationId, userId: 2, branchId, role: "approver", isActive: 1 }];
    const branch = [{ id: branchId, organisationId, isActive: 1 }];
    const journal = [{ id: journalId, organisationId, branchId, status: "ready", preparedByUserId: 1, currency: "NGN", economicEventId: "event-r3", sourceType: "invoice", sourceId: invoiceId, reversalOfJournalId: null }];
    const lines = [{ id: "debit-line", journalId, accountId: debitAccountId, currency: "NGN", debitMinor: "100000", creditMinor: "0" }, { id: "credit-line", journalId, accountId: creditAccountId, currency: "NGN", debitMinor: "0", creditMinor: "100000" }];
    const accounts = [{ id: debitAccountId, organisationId, isActive: 1 }, { id: creditAccountId, organisationId, isActive: 1 }];
    const { database, inserted, updates } = queuedDatabase([membership, branch, journal, lines, accounts, []]);
    getDbMock.mockResolvedValue(database);

    const result = await appRouter.createCaller(authContext(2)).ledger.journals.post({ organisationId, branchId, journalId, rationale: "Reviewed balance and source linkage independently.", idempotencyKey: "release3-independent-post-1" });

    expect(result.replayed).toBe(false);
    expect(updates).toEqual(expect.arrayContaining([expect.objectContaining({ status: "posted", postedByUserId: 2 }), expect.objectContaining({ status: "posted" })]));
    expect(inserted.some(row => row.decision === "posted" && row.journalId === journalId)).toBe(true);
    expect(inserted.some(row => row.action === "release3.ledger_journal_posted" && row.entityId === journalId)).toBe(true);
  });
});
