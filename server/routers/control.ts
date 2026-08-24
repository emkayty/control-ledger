import { TRPCError } from "@trpc/server";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import {
  auditEvents,
  branches,
  controlExceptions,
  customers,
  evidenceEvents,
  evidenceFiles,
  exceptionNotes,
  idempotencyKeys,
  integrationIntakeRecords,
  organisationMemberships,
  organisations,
  receivableObligations,
  reconciliationLinks,
  users,
} from "../../drizzle/schema";
import { requireScopedMembership, permissions } from "../control/access";
import { assertEvidenceFileInput, assertEvidenceLinkScope } from "../control/fileSecurity";
import { assertMinorAmount, isMinorAmount } from "../control/money";
import { determineReconciliation } from "../control/reconciliation";
import { getDb } from "../db";
import { storageGet, storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";

const controlScope = z.object({ organisationId: z.string().uuid(), branchId: z.string().uuid() });
const correlation = () => crypto.randomUUID();
const recordId = () => crypto.randomUUID();

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function writeAudit(input: {
  organisationId: string;
  branchId?: string;
  actorUserId: number;
  action: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  await db.insert(auditEvents).values({ id: recordId(), ...input });
}

async function requireExistingScope(input: { organisationId: string; branchId: string; userId: number; allowed: readonly any[] }) {
  await requireScopedMembership(input);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const branch = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, input.branchId), eq(branches.organisationId, input.organisationId), eq(branches.isActive, 1)))
    .limit(1);
  if (!branch[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Branch not found in the selected organisation." });
  return db;
}

async function getOrCreateIdempotent(input: {
  organisationId: string;
  userId: number;
  action: string;
  idempotencyKey: string;
  request: unknown;
  execute: () => Promise<{ entityId: string; correlationId: string }>;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const requestHash = sha256(JSON.stringify(input.request));
  const existing = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.organisationId, input.organisationId),
        eq(idempotencyKeys.actorUserId, input.userId),
        eq(idempotencyKeys.action, input.action),
        eq(idempotencyKeys.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);

  if (existing[0]) {
    if (existing[0].requestHash !== requestHash) {
      throw new TRPCError({ code: "CONFLICT", message: "This idempotency key was previously used for a different request." });
    }
    const cached = existing[0].responseMetadata as { entityId: string; correlationId: string } | null;
    if (!cached) throw new TRPCError({ code: "CONFLICT", message: "This request is still being processed. Try again shortly." });
    return { ...cached, replayed: true };
  }

  const id = recordId();
  try {
    await db.insert(idempotencyKeys).values({
      id,
      organisationId: input.organisationId,
      actorUserId: input.userId,
      action: input.action,
      idempotencyKey: input.idempotencyKey,
      requestHash,
    });
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

const uploadInput = z.object({
  organisationId: z.string().uuid(),
  branchId: z.string().uuid(),
  evidenceEventId: z.string().uuid().optional(),
  exceptionId: z.string().uuid().optional(),
  filename: z.string().min(1).max(180),
  contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  contentBase64: z.string().min(1).max(10_700_000),
  idempotencyKey: z.string().min(8).max(128),
});

export const controlRouter = router({
  workspace: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const memberships = await db
        .select({
          organisationId: organisationMemberships.organisationId,
          branchId: organisationMemberships.branchId,
          role: organisationMemberships.role,
          organisationName: organisations.name,
        })
        .from(organisationMemberships)
        .innerJoin(organisations, eq(organisations.id, organisationMemberships.organisationId))
        .where(and(eq(organisationMemberships.userId, ctx.user.id), eq(organisationMemberships.isActive, 1)));

      const organisationIds = Array.from(new Set(memberships.map(membership => membership.organisationId)));
      const branchRows = organisationIds.length
        ? await db.select().from(branches).where(inArray(branches.organisationId, organisationIds))
        : [];
      const organisationWideIds = new Set(memberships.filter(membership => membership.branchId === null).map(membership => membership.organisationId));
      const permittedBranchIds = new Set(memberships.map(membership => membership.branchId).filter((branchId): branchId is string => Boolean(branchId)));
      return {
        memberships,
        branches: branchRows.filter(branch => branch.isActive === 1 && (organisationWideIds.has(branch.organisationId) || permittedBranchIds.has(branch.id))),
      };
    }),
    bootstrap: protectedProcedure
      .input(z.object({ organisationName: z.string().min(2).max(160), branchName: z.string().min(2).max(160) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
        const existing = await db
          .select({ id: organisationMemberships.id })
          .from(organisationMemberships)
          .where(and(eq(organisationMemberships.userId, ctx.user.id), eq(organisationMemberships.isActive, 1)))
          .limit(1);
        if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "A workspace already exists for this account." });
        const organisationId = recordId();
        const branchId = recordId();
        const correlationId = correlation();
        await db.transaction(async tx => {
          await tx.insert(organisations).values({ id: organisationId, name: input.organisationName, createdByUserId: ctx.user.id });
          await tx.insert(branches).values({ id: branchId, organisationId, name: input.branchName, code: "MAIN" });
          await tx.insert(organisationMemberships).values({
            id: recordId(),
            organisationId,
            userId: ctx.user.id,
            role: "owner",
          });
          await tx.insert(auditEvents).values({
            id: recordId(),
            organisationId,
            branchId,
            actorUserId: ctx.user.id,
            action: "workspace.bootstrapped",
            entityType: "organisation",
            entityId: organisationId,
            correlationId,
            metadata: { branchName: input.branchName },
          });
        });
        return { organisationId, branchId };
      }),
  }),

  branches: router({
    create: protectedProcedure.input(z.object({
      organisationId: z.string().uuid(),
      name: z.string().min(2).max(160),
      code: z.string().min(2).max(16).regex(/^[A-Za-z0-9_-]+$/, "Use only letters, numbers, underscores, or hyphens."),
      idempotencyKey: z.string().min(8).max(128),
    })).mutation(async ({ ctx, input }) => {
      await requireScopedMembership({ userId: ctx.user.id, organisationId: input.organisationId, allowed: ["owner"] });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const code = input.code.trim().toUpperCase();
      return getOrCreateIdempotent({
        organisationId: input.organisationId, userId: ctx.user.id, action: "branch.create", idempotencyKey: input.idempotencyKey, request: { ...input, code },
        execute: async () => {
          const duplicate = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.organisationId, input.organisationId), eq(branches.code, code))).limit(1);
          if (duplicate[0]) throw new TRPCError({ code: "CONFLICT", message: "This branch code already exists in the organisation." });
          const entityId = recordId(); const correlationId = correlation();
          await db.insert(branches).values({ id: entityId, organisationId: input.organisationId, name: input.name.trim(), code });
          await writeAudit({ organisationId: input.organisationId, branchId: entityId, actorUserId: ctx.user.id, action: "branch.created", entityType: "branch", entityId, correlationId, metadata: { name: input.name.trim(), code } });
          return { entityId, correlationId };
        },
      });
    }),
  }),

  audit: router({
    list: protectedProcedure.input(controlScope.extend({ limit: z.number().int().min(1).max(100).default(50) })).query(async ({ ctx, input }) => {
      const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.read });
      return db.select({
        id: auditEvents.id,
        action: auditEvents.action,
        entityType: auditEvents.entityType,
        entityId: auditEvents.entityId,
        branchId: auditEvents.branchId,
        correlationId: auditEvents.correlationId,
        metadata: auditEvents.metadata,
        occurredAt: auditEvents.occurredAt,
        actorName: users.name,
        actorEmail: users.email,
      }).from(auditEvents).innerJoin(users, eq(users.id, auditEvents.actorUserId)).where(and(eq(auditEvents.organisationId, input.organisationId), or(eq(auditEvents.branchId, input.branchId), isNull(auditEvents.branchId)))).orderBy(desc(auditEvents.occurredAt)).limit(input.limit);
    }),
  }),

  memberships: router({
    list: protectedProcedure.input(z.object({ organisationId: z.string().uuid() })).query(async ({ ctx, input }) => {
      const manager = await requireScopedMembership({ userId: ctx.user.id, organisationId: input.organisationId, allowed: permissions.manageMemberships });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const scopeCondition = manager.branchId ? or(eq(organisationMemberships.branchId, manager.branchId), isNull(organisationMemberships.branchId)) : undefined;
      return db.select({
        id: organisationMemberships.id,
        userId: organisationMemberships.userId,
        branchId: organisationMemberships.branchId,
        role: organisationMemberships.role,
        isActive: organisationMemberships.isActive,
        createdAt: organisationMemberships.createdAt,
        name: users.name,
        email: users.email,
      }).from(organisationMemberships).innerJoin(users, eq(users.id, organisationMemberships.userId)).where(and(eq(organisationMemberships.organisationId, input.organisationId), scopeCondition)).orderBy(desc(organisationMemberships.createdAt));
    }),
    grant: protectedProcedure.input(z.object({
      organisationId: z.string().uuid(),
      branchId: z.string().uuid().nullable(),
      existingUserEmail: z.string().email(),
      role: z.enum(["owner", "controller", "operator", "manager", "approver"]),
      idempotencyKey: z.string().min(8).max(128),
    })).mutation(async ({ ctx, input }) => {
      const manager = await requireScopedMembership({ userId: ctx.user.id, organisationId: input.organisationId, allowed: permissions.manageMemberships });
      if (manager.role === "controller" && (["owner", "controller"].includes(input.role) || !input.branchId || input.branchId !== manager.branchId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "A branch controller can only grant operator, manager, or approver access within their own branch." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      if (input.branchId) {
        const branch = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, input.branchId), eq(branches.organisationId, input.organisationId), eq(branches.isActive, 1))).limit(1);
        if (!branch[0]) throw new TRPCError({ code: "NOT_FOUND", message: "The selected branch is not active in this organisation." });
      }
      const target = await db.select({ id: users.id }).from(users).where(eq(users.email, input.existingUserEmail)).limit(1);
      if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "This person must sign in to Control Ledger before access can be granted." });
      return getOrCreateIdempotent({
        organisationId: input.organisationId, userId: ctx.user.id, action: "membership.grant", idempotencyKey: input.idempotencyKey, request: input,
        execute: async () => {
          const correlationId = correlation();
          const existing = await db.select().from(organisationMemberships).where(and(eq(organisationMemberships.organisationId, input.organisationId), eq(organisationMemberships.userId, target[0].id), input.branchId ? eq(organisationMemberships.branchId, input.branchId) : isNull(organisationMemberships.branchId))).limit(1);
          const entityId = existing[0]?.id ?? recordId();
          if (existing[0]) await db.update(organisationMemberships).set({ role: input.role, isActive: 1 }).where(eq(organisationMemberships.id, existing[0].id));
          else await db.insert(organisationMemberships).values({ id: entityId, organisationId: input.organisationId, userId: target[0].id, branchId: input.branchId, role: input.role });
          await writeAudit({ organisationId: input.organisationId, branchId: input.branchId ?? undefined, actorUserId: ctx.user.id, action: existing[0] ? "membership.updated" : "membership.granted", entityType: "organisation_membership", entityId, correlationId, metadata: { targetUserId: target[0].id, role: input.role, branchId: input.branchId } });
          return { entityId, correlationId };
        },
      });
    }),
    revoke: protectedProcedure.input(z.object({ organisationId: z.string().uuid(), membershipId: z.string().uuid(), idempotencyKey: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      const manager = await requireScopedMembership({ userId: ctx.user.id, organisationId: input.organisationId, allowed: permissions.manageMemberships });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const target = await db.select().from(organisationMemberships).where(and(eq(organisationMemberships.id, input.membershipId), eq(organisationMemberships.organisationId, input.organisationId))).limit(1);
      if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found." });
      if (target[0].userId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot revoke your own active access." });
      if (manager.role === "controller" && (target[0].branchId !== manager.branchId || ["owner", "controller"].includes(target[0].role))) throw new TRPCError({ code: "FORBIDDEN", message: "A branch controller can only revoke non-controller access in their own branch." });
      return getOrCreateIdempotent({
        organisationId: input.organisationId, userId: ctx.user.id, action: "membership.revoke", idempotencyKey: input.idempotencyKey, request: input,
        execute: async () => {
          const correlationId = correlation();
          await db.update(organisationMemberships).set({ isActive: 0 }).where(eq(organisationMemberships.id, target[0].id));
          await writeAudit({ organisationId: input.organisationId, branchId: target[0].branchId ?? undefined, actorUserId: ctx.user.id, action: "membership.revoked", entityType: "organisation_membership", entityId: target[0].id, correlationId, metadata: { targetUserId: target[0].userId, role: target[0].role, branchId: target[0].branchId } });
          return { entityId: target[0].id, correlationId };
        },
      });
    }),
  }),

  dashboard: protectedProcedure.input(controlScope).query(async ({ ctx, input }) => {
    const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.read });
    const [obligations, evidence, links, exceptions] = await Promise.all([
      db.select().from(receivableObligations).where(and(eq(receivableObligations.organisationId, input.organisationId), eq(receivableObligations.branchId, input.branchId))),
      db.select().from(evidenceEvents).where(and(eq(evidenceEvents.organisationId, input.organisationId), eq(evidenceEvents.branchId, input.branchId))),
      db.select().from(reconciliationLinks).where(eq(reconciliationLinks.organisationId, input.organisationId)),
      db.select().from(controlExceptions).where(and(eq(controlExceptions.organisationId, input.organisationId), eq(controlExceptions.branchId, input.branchId))).orderBy(desc(controlExceptions.createdAt)).limit(8),
    ]);
    const totalDue = obligations.reduce((sum, row) => sum + BigInt(row.amountMinor), BigInt(0));
    const obligationIds = new Set(obligations.map(row => row.id));
    const reconciled = links
      .filter(link => obligationIds.has(link.obligationId))
      .reduce((sum, row) => sum + BigInt(row.allocatedMinor), BigInt(0));
    const openExceptions = exceptions.filter(row => !["resolved", "rejected"].includes(row.status));
    return {
      position: {
        receivableMinor: totalDue.toString(),
        reconciledMinor: reconciled.toString(),
        unreconciledMinor: (totalDue > reconciled ? totalDue - reconciled : BigInt(0)).toString(),
        currency: obligations[0]?.currency ?? "NGN",
      },
      coverage: totalDue === BigInt(0) ? 0 : Number((reconciled * BigInt(10000)) / totalDue) / 100,
      counts: {
        obligations: obligations.length,
        recordedEvidence: evidence.length,
        unresolvedExceptions: openExceptions.length,
      },
      priorityExceptions: exceptions,
    };
  }),

  customers: router({
    list: protectedProcedure.input(controlScope).query(async ({ ctx, input }) => {
      const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.read });
      return db.select().from(customers).where(and(eq(customers.organisationId, input.organisationId), eq(customers.branchId, input.branchId))).orderBy(desc(customers.createdAt));
    }),
    create: protectedProcedure
      .input(controlScope.extend({ name: z.string().min(2).max(180), code: z.string().min(2).max(64), contactName: z.string().max(160).optional(), contactEmail: z.string().email().optional(), contactPhone: z.string().max(64).optional(), idempotencyKey: z.string().min(8).max(128) }))
      .mutation(async ({ ctx, input }) => {
        await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.createCustomer });
        return getOrCreateIdempotent({
          organisationId: input.organisationId, userId: ctx.user.id, action: "customer.create", idempotencyKey: input.idempotencyKey, request: input,
          execute: async () => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
            const entityId = recordId(); const correlationId = correlation();
            await db.insert(customers).values({ ...input, id: entityId, code: input.code.toUpperCase(), createdByUserId: ctx.user.id });
            await writeAudit({ organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "customer.created", entityType: "customer", entityId, correlationId, metadata: { code: input.code.toUpperCase() } });
            return { entityId, correlationId };
          },
        });
      }),
  }),

  obligations: router({
    list: protectedProcedure.input(controlScope).query(async ({ ctx, input }) => {
      const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.read });
      return db.select().from(receivableObligations).where(and(eq(receivableObligations.organisationId, input.organisationId), eq(receivableObligations.branchId, input.branchId))).orderBy(desc(receivableObligations.createdAt));
    }),
    create: protectedProcedure
      .input(controlScope.extend({ customerId: z.string().uuid(), reference: z.string().min(2).max(96), amountMinor: z.string(), currency: z.string().length(3).transform(value => value.toUpperCase()), dueAt: z.coerce.date().optional(), sourceReference: z.string().max(128).optional(), idempotencyKey: z.string().min(8).max(128) }))
      .mutation(async ({ ctx, input }) => {
        assertMinorAmount(input.amountMinor);
        const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.createObligation });
        const customer = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, input.customerId), eq(customers.organisationId, input.organisationId), eq(customers.branchId, input.branchId))).limit(1);
        if (!customer[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Customer is not in the selected branch." });
        return getOrCreateIdempotent({
          organisationId: input.organisationId, userId: ctx.user.id, action: "obligation.create", idempotencyKey: input.idempotencyKey, request: input,
          execute: async () => {
            const entityId = recordId(); const correlationId = correlation();
            await db.insert(receivableObligations).values({ ...input, id: entityId, amountMinor: input.amountMinor, sourceType: "manual", correlationId, createdByUserId: ctx.user.id });
            await writeAudit({ organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "obligation.recorded", entityType: "receivable_obligation", entityId, correlationId, metadata: { reference: input.reference, amountMinor: input.amountMinor, currency: input.currency } });
            return { entityId, correlationId };
          },
        });
      }),
    correct: protectedProcedure
      .input(controlScope.extend({ originalObligationId: z.string().uuid(), amountMinor: z.string(), reason: z.string().min(4).max(500), idempotencyKey: z.string().min(8).max(128) }))
      .mutation(async ({ ctx, input }) => {
        assertMinorAmount(input.amountMinor);
        const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.createObligation });
        const [original] = await db.select().from(receivableObligations).where(and(eq(receivableObligations.id, input.originalObligationId), eq(receivableObligations.organisationId, input.organisationId), eq(receivableObligations.branchId, input.branchId))).limit(1);
        if (!original) throw new TRPCError({ code: "NOT_FOUND", message: "Original obligation was not found in the selected branch." });
        return getOrCreateIdempotent({
          organisationId: input.organisationId, userId: ctx.user.id, action: "obligation.correct", idempotencyKey: input.idempotencyKey, request: input,
          execute: async () => {
            const entityId = recordId(); const correlationId = correlation();
            await db.insert(receivableObligations).values({ id: entityId, organisationId: original.organisationId, branchId: original.branchId, customerId: original.customerId, reference: `${original.reference}-COR-${entityId.slice(0, 6).toUpperCase()}`, amountMinor: input.amountMinor, currency: original.currency, dueAt: original.dueAt, status: "open", sourceType: "correction", sourceReference: original.reference, sourceMetadata: { reason: input.reason, originalObligationId: original.id }, correlationId, createdByUserId: ctx.user.id, correctsObligationId: original.id });
            await writeAudit({ organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "obligation.correction_recorded", entityType: "receivable_obligation", entityId, correlationId, metadata: { correctsObligationId: original.id, reason: input.reason, amountMinor: input.amountMinor } });
            return { entityId, correlationId };
          },
        });
      }),
  }),

  evidence: router({
    list: protectedProcedure.input(controlScope).query(async ({ ctx, input }) => {
      const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const [events, links] = await Promise.all([
        db.select().from(evidenceEvents).where(and(eq(evidenceEvents.organisationId, input.organisationId), eq(evidenceEvents.branchId, input.branchId))).orderBy(desc(evidenceEvents.recordedAt)),
        db.select().from(reconciliationLinks).where(eq(reconciliationLinks.organisationId, input.organisationId)),
      ]);
      return events.map(event => {
        const link = links.find(item => item.evidenceEventId === event.id);
        const controlStatus = link ? (link.matchType === "exact" ? "matched" : "unresolved") : event.status;
        return { ...event, controlStatus, reconciliation: link ?? null };
      });
    }),
    intake: protectedProcedure
      .input(controlScope.extend({ obligationId: z.string().uuid().optional(), customerId: z.string().uuid().optional(), kind: z.enum(["delivery_observation", "payment_observation", "settlement_evidence"]), amountMinor: z.string(), currency: z.string().length(3).transform(value => value.toUpperCase()), sourceName: z.string().min(2).max(96), sourceReference: z.string().min(2).max(160), sourceMetadata: z.record(z.string(), z.string()).optional(), occurredAt: z.coerce.date().optional(), idempotencyKey: z.string().min(8).max(128) }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.recordEvidence });
        const duplicate = await db.select({ id: integrationIntakeRecords.id }).from(integrationIntakeRecords).where(and(eq(integrationIntakeRecords.organisationId, input.organisationId), eq(integrationIntakeRecords.sourceName, input.sourceName), eq(integrationIntakeRecords.sourceReference, input.sourceReference))).limit(1);
        if (duplicate[0]) return { status: "duplicate" as const, intakeId: duplicate[0].id };
        if (!isMinorAmount(input.amountMinor)) {
          const intakeId = recordId(); const correlationId = correlation();
          await db.transaction(async tx => {
            await tx.insert(integrationIntakeRecords).values({ id: intakeId, organisationId: input.organisationId, branchId: input.branchId, sourceName: input.sourceName, sourceReference: input.sourceReference, payloadHash: sha256(JSON.stringify(input)), status: "quarantined", quarantineReason: "Amount must be an exact minor-unit integer.", sourceMetadata: input.sourceMetadata, correlationId });
            await tx.insert(auditEvents).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "evidence.intake_quarantined", entityType: "integration_intake_record", entityId: intakeId, correlationId, metadata: { reason: "invalid_minor_amount", sourceName: input.sourceName, sourceReference: input.sourceReference } });
          });
          return { status: "quarantined" as const, intakeId };
        }
        return getOrCreateIdempotent({
          organisationId: input.organisationId, userId: ctx.user.id, action: "evidence.intake", idempotencyKey: input.idempotencyKey, request: input,
          execute: async () => {
            const evidenceId = recordId(); const intakeId = recordId(); const correlationId = correlation(); const payloadHash = sha256(JSON.stringify(input.sourceMetadata ?? {}));
            await db.transaction(async tx => {
              await tx.insert(evidenceEvents).values({ ...input, id: evidenceId, amountMinor: input.amountMinor, sourceMetadata: input.sourceMetadata, correlationId, payloadHash, createdByUserId: ctx.user.id });
              await tx.insert(integrationIntakeRecords).values({ id: intakeId, organisationId: input.organisationId, branchId: input.branchId, sourceName: input.sourceName, sourceReference: input.sourceReference, payloadHash, sourceMetadata: input.sourceMetadata, evidenceEventId: evidenceId, correlationId });
              await tx.insert(auditEvents).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "evidence.recorded", entityType: "evidence_event", entityId: evidenceId, correlationId, metadata: { kind: input.kind, sourceName: input.sourceName, sourceReference: input.sourceReference } });
            });
            return { entityId: evidenceId, correlationId };
          },
        });
      }),
    correct: protectedProcedure
      .input(controlScope.extend({ originalEvidenceEventId: z.string().uuid(), amountMinor: z.string(), reason: z.string().min(4).max(500), idempotencyKey: z.string().min(8).max(128) }))
      .mutation(async ({ ctx, input }) => {
        assertMinorAmount(input.amountMinor);
        const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.recordEvidence });
        const [original] = await db.select().from(evidenceEvents).where(and(eq(evidenceEvents.id, input.originalEvidenceEventId), eq(evidenceEvents.organisationId, input.organisationId), eq(evidenceEvents.branchId, input.branchId))).limit(1);
        if (!original) throw new TRPCError({ code: "NOT_FOUND", message: "Original evidence was not found in the selected branch." });
        return getOrCreateIdempotent({
          organisationId: input.organisationId, userId: ctx.user.id, action: "evidence.correct", idempotencyKey: input.idempotencyKey, request: input,
          execute: async () => {
            const entityId = recordId(); const correlationId = correlation();
            await db.insert(evidenceEvents).values({ id: entityId, organisationId: original.organisationId, branchId: original.branchId, obligationId: original.obligationId, customerId: original.customerId, kind: "correction", status: "recorded", amountMinor: input.amountMinor, currency: original.currency, sourceName: "correction", sourceReference: `${original.id}-COR-${entityId.slice(0, 6).toUpperCase()}`, sourceMetadata: { reason: input.reason, originalEvidenceEventId: original.id }, occurredAt: new Date(), correlationId, correctsEventId: original.id, createdByUserId: ctx.user.id });
            await writeAudit({ organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "evidence.correction_recorded", entityType: "evidence_event", entityId, correlationId, metadata: { correctsEventId: original.id, reason: input.reason, amountMinor: input.amountMinor } });
            return { entityId, correlationId };
          },
        });
      }),
    files: protectedProcedure.input(controlScope.extend({ evidenceEventId: z.string().uuid().optional() })).query(async ({ ctx, input }) => {
      const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const rows = await db.select({
        id: evidenceFiles.id,
        evidenceEventId: evidenceFiles.evidenceEventId,
        exceptionId: evidenceFiles.exceptionId,
        originalName: evidenceFiles.originalName,
        contentType: evidenceFiles.contentType,
        sizeBytes: evidenceFiles.sizeBytes,
        sourceName: evidenceFiles.sourceName,
        createdAt: evidenceFiles.createdAt,
      }).from(evidenceFiles).where(and(eq(evidenceFiles.organisationId, input.organisationId), eq(evidenceFiles.branchId, input.branchId)));
      return input.evidenceEventId ? rows.filter(row => row.evidenceEventId === input.evidenceEventId) : rows;
    }),
    uploadFile: protectedProcedure.input(uploadInput).mutation(async ({ ctx, input }) => {
      const scopedDb = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.recordEvidence });
      const fileBytes = Buffer.from(input.contentBase64.replace(/^data:.*;base64,/, ""), "base64");
      assertEvidenceFileInput({ contentType: input.contentType, sizeBytes: fileBytes.length });
      if (input.evidenceEventId) {
        const linked = await scopedDb.select({ organisationId: evidenceEvents.organisationId, branchId: evidenceEvents.branchId }).from(evidenceEvents).where(eq(evidenceEvents.id, input.evidenceEventId)).limit(1);
        if (!linked[0]) throw new TRPCError({ code: "NOT_FOUND", message: "The evidence event for this file was not found." });
        assertEvidenceLinkScope({ requestedOrganisationId: input.organisationId, requestedBranchId: input.branchId, linkedOrganisationId: linked[0].organisationId, linkedBranchId: linked[0].branchId });
      }
      if (input.exceptionId) {
        const linked = await scopedDb.select({ organisationId: controlExceptions.organisationId, branchId: controlExceptions.branchId }).from(controlExceptions).where(eq(controlExceptions.id, input.exceptionId)).limit(1);
        if (!linked[0]) throw new TRPCError({ code: "NOT_FOUND", message: "The exception for this file was not found." });
        assertEvidenceLinkScope({ requestedOrganisationId: input.organisationId, requestedBranchId: input.branchId, linkedOrganisationId: linked[0].organisationId, linkedBranchId: linked[0].branchId });
      }
      return getOrCreateIdempotent({
        organisationId: input.organisationId, userId: ctx.user.id, action: "evidence.upload", idempotencyKey: input.idempotencyKey, request: { ...input, contentBase64: `sha256:${sha256(input.contentBase64)}` },
        execute: async () => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
          const entityId = recordId(); const correlationId = correlation();
          const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
          const { key, url } = await storagePut(`${input.organisationId}/${input.branchId}/evidence/${entityId}-${safeName}`, fileBytes, input.contentType);
          await db.insert(evidenceFiles).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, evidenceEventId: input.evidenceEventId, exceptionId: input.exceptionId, storageKey: key, storageUrl: url, originalName: safeName, contentType: input.contentType, sizeBytes: fileBytes.length, checksum: sha256(input.contentBase64), correlationId, createdByUserId: ctx.user.id });
          await writeAudit({ organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "evidence.file_uploaded", entityType: "evidence_file", entityId, correlationId, metadata: { contentType: input.contentType, sizeBytes: fileBytes.length } });
          return { entityId, correlationId };
        },
      });
    }),
    getFile: protectedProcedure.input(z.object({ organisationId: z.string().uuid(), fileId: z.string().uuid() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const file = await db.select().from(evidenceFiles).where(and(eq(evidenceFiles.id, input.fileId), eq(evidenceFiles.organisationId, input.organisationId))).limit(1);
      if (!file[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Evidence file not found." });
      await requireScopedMembership({ userId: ctx.user.id, organisationId: input.organisationId, branchId: file[0].branchId, allowed: permissions.read });
      return { ...file[0], url: (await storageGet(file[0].storageKey)).url };
    }),
  }),

  reconciliation: router({
    run: protectedProcedure
      .input(controlScope.extend({ obligationId: z.string().uuid(), evidenceEventId: z.string().uuid(), treatAsShort: z.boolean().default(false), idempotencyKey: z.string().min(8).max(128) }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.reconcile });
        const [obligation] = await db.select().from(receivableObligations).where(and(eq(receivableObligations.id, input.obligationId), eq(receivableObligations.organisationId, input.organisationId), eq(receivableObligations.branchId, input.branchId))).limit(1);
        const [evidence] = await db.select().from(evidenceEvents).where(and(eq(evidenceEvents.id, input.evidenceEventId), eq(evidenceEvents.organisationId, input.organisationId), eq(evidenceEvents.branchId, input.branchId))).limit(1);
        if (!obligation || !evidence || !evidence.amountMinor || evidence.currency !== obligation.currency) throw new TRPCError({ code: "BAD_REQUEST", message: "An in-scope, same-currency obligation and monetary evidence event are required." });
        const existing = await db.select({ id: reconciliationLinks.id }).from(reconciliationLinks).where(and(eq(reconciliationLinks.obligationId, obligation.id), eq(reconciliationLinks.evidenceEventId, evidence.id))).limit(1);
        return getOrCreateIdempotent({
          organisationId: input.organisationId, userId: ctx.user.id, action: "reconciliation.run", idempotencyKey: input.idempotencyKey, request: input,
          execute: async () => {
            const correlationId = correlation(); const entityId = recordId();
            if (existing[0]) {
              await db.transaction(async tx => {
                await tx.insert(controlExceptions).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, obligationId: obligation.id, evidenceEventId: evidence.id, type: "duplicate_input", severity: "medium", title: "Duplicate reconciliation attempt requires review", valueImpactMinor: evidence.amountMinor, currency: obligation.currency, ownerUserId: ctx.user.id, dueAt: new Date(Date.now() + 72 * 60 * 60 * 1000), correlationId, createdByUserId: ctx.user.id });
                await tx.insert(auditEvents).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "reconciliation.duplicate_detected", entityType: "control_exception", entityId, correlationId, metadata: { originalLinkId: existing[0].id, obligationId: obligation.id, evidenceEventId: evidence.id } });
              });
              return { entityId, correlationId };
            }
            const delayed = Boolean(obligation.dueAt && evidence.occurredAt && evidence.occurredAt > obligation.dueAt);
            const outcome = determineReconciliation({ obligationMinor: String(obligation.amountMinor), observedMinor: String(evidence.amountMinor), hasExistingLink: false, delayed, shortPayment: input.treatAsShort });
            await db.transaction(async tx => {
              await tx.insert(reconciliationLinks).values({ id: entityId, organisationId: input.organisationId, obligationId: obligation.id, evidenceEventId: evidence.id, allocatedMinor: outcome.allocatedMinor, currency: obligation.currency, matchType: outcome.matchType, ruleVersion: "release-1.0", createdByUserId: ctx.user.id, correlationId });
              if (outcome.exceptionType) {
                await tx.insert(controlExceptions).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, obligationId: obligation.id, evidenceEventId: evidence.id, type: outcome.exceptionType, severity: outcome.exceptionType === "short_payment" ? "high" : "medium", title: `Reconciliation requires review: ${outcome.exceptionType.replaceAll("_", " ")}`, valueImpactMinor: outcome.unresolvedMinor, currency: obligation.currency, ownerUserId: ctx.user.id, dueAt: new Date(Date.now() + 72 * 60 * 60 * 1000), approvalRequired: outcome.exceptionType === "short_payment" ? 1 : 0, correlationId, createdByUserId: ctx.user.id });
              }
              await tx.insert(auditEvents).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "reconciliation.completed", entityType: "reconciliation_link", entityId, correlationId, metadata: outcome });
            });
            return { entityId, correlationId };
          },
        });
      }),
  }),

  exceptions: router({
    list: protectedProcedure.input(controlScope).query(async ({ ctx, input }) => {
      const db = await requireExistingScope({ ...input, userId: ctx.user.id, allowed: permissions.read });
      return db.select().from(controlExceptions).where(and(eq(controlExceptions.organisationId, input.organisationId), eq(controlExceptions.branchId, input.branchId))).orderBy(desc(controlExceptions.createdAt));
    }),
    notes: protectedProcedure.input(z.object({ organisationId: z.string().uuid(), exceptionId: z.string().uuid() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const [exception] = await db.select({ branchId: controlExceptions.branchId }).from(controlExceptions).where(and(eq(controlExceptions.id, input.exceptionId), eq(controlExceptions.organisationId, input.organisationId))).limit(1);
      if (!exception) throw new TRPCError({ code: "NOT_FOUND", message: "Exception not found." });
      await requireScopedMembership({ userId: ctx.user.id, organisationId: input.organisationId, branchId: exception.branchId, allowed: permissions.read });
      return db.select().from(exceptionNotes).where(and(eq(exceptionNotes.exceptionId, input.exceptionId), eq(exceptionNotes.organisationId, input.organisationId))).orderBy(desc(exceptionNotes.createdAt));
    }),
    addNote: protectedProcedure.input(z.object({ organisationId: z.string().uuid(), exceptionId: z.string().uuid(), body: z.string().min(2).max(4000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const [exception] = await db.select().from(controlExceptions).where(and(eq(controlExceptions.id, input.exceptionId), eq(controlExceptions.organisationId, input.organisationId))).limit(1);
      if (!exception) throw new TRPCError({ code: "NOT_FOUND", message: "Exception not found." });
      await requireScopedMembership({ userId: ctx.user.id, organisationId: input.organisationId, branchId: exception.branchId, allowed: permissions.resolve });
      const id = recordId(); const correlationId = correlation();
      await db.insert(exceptionNotes).values({ id, exceptionId: exception.id, organisationId: input.organisationId, body: input.body, createdByUserId: ctx.user.id, correlationId });
      await writeAudit({ organisationId: input.organisationId, branchId: exception.branchId, actorUserId: ctx.user.id, action: "exception.note_added", entityType: "control_exception", entityId: exception.id, correlationId });
      return { id };
    }),
    submitResolution: protectedProcedure.input(z.object({ organisationId: z.string().uuid(), exceptionId: z.string().uuid(), note: z.string().min(4).max(4000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const [exception] = await db.select().from(controlExceptions).where(and(eq(controlExceptions.id, input.exceptionId), eq(controlExceptions.organisationId, input.organisationId))).limit(1);
      if (!exception) throw new TRPCError({ code: "NOT_FOUND", message: "Exception not found." });
      await requireScopedMembership({ userId: ctx.user.id, organisationId: input.organisationId, branchId: exception.branchId, allowed: permissions.resolve });
      const correlationId = correlation();
      await db.update(controlExceptions).set({ status: exception.approvalRequired ? "pending_approval" : "resolved", resolutionNote: input.note, resolvedAt: exception.approvalRequired ? null : new Date(), resolvedByUserId: exception.approvalRequired ? null : ctx.user.id }).where(eq(controlExceptions.id, exception.id));
      await writeAudit({ organisationId: input.organisationId, branchId: exception.branchId, actorUserId: ctx.user.id, action: exception.approvalRequired ? "exception.resolution_submitted" : "exception.resolved", entityType: "control_exception", entityId: exception.id, correlationId, metadata: { approvalRequired: Boolean(exception.approvalRequired) } });
      return { status: exception.approvalRequired ? "pending_approval" : "resolved" };
    }),
    approveResolution: protectedProcedure.input(z.object({ organisationId: z.string().uuid(), exceptionId: z.string().uuid(), approve: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const [exception] = await db.select().from(controlExceptions).where(and(eq(controlExceptions.id, input.exceptionId), eq(controlExceptions.organisationId, input.organisationId))).limit(1);
      if (!exception) throw new TRPCError({ code: "NOT_FOUND", message: "Exception not found." });
      if (exception.status !== "pending_approval") throw new TRPCError({ code: "CONFLICT", message: "This exception is not awaiting approval." });
      if (exception.createdByUserId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "The exception initiator cannot approve its own resolution." });
      await requireScopedMembership({ userId: ctx.user.id, organisationId: input.organisationId, branchId: exception.branchId, allowed: permissions.approve });
      const correlationId = correlation();
      await db.update(controlExceptions).set({ status: input.approve ? "resolved" : "investigating", resolvedAt: input.approve ? new Date() : null, resolvedByUserId: input.approve ? ctx.user.id : null }).where(eq(controlExceptions.id, exception.id));
      await writeAudit({ organisationId: input.organisationId, branchId: exception.branchId, actorUserId: ctx.user.id, action: input.approve ? "exception.approved" : "exception.returned", entityType: "control_exception", entityId: exception.id, correlationId });
      return { status: input.approve ? "resolved" : "investigating" };
    }),
  }),
});
