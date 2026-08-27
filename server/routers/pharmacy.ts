import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  auditEvents,
  branches,
  idempotencyKeys,
  pharmacyBatchBalances,
  pharmacyDispensingDecisions,
  pharmacyDispensingLines,
  pharmacyDispensingRequests,
  pharmacyPharmacistAuthorisations,
  pharmacyPolicies,
  pharmacySupplyEvents,
  products,
  stockLots,
  stockMovements,
} from "../../drizzle/schema";
import { permissions, requireScopedMembership } from "../control/access";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const scopeInput = z.object({ organisationId: z.string().uuid(), branchId: z.string().uuid() });
const idempotencyInput = z.object({ idempotencyKey: z.string().min(8).max(128) });
const ZERO = BigInt(0);
const THOUSAND = BigInt(1000);
const POSITIVE_QUANTITY = z.string().regex(/^\d+(\.\d{1,3})?$/, "Use a positive quantity with at most three decimal places.").refine(value => quantityMilli(value) > ZERO, "Quantity must be positive.");
const POLICY_NOTICE_VERSION = "pharmacy-dispensing-v1";
const ENABLE_CONFIRMATION = "ENABLE PHARMACY DISPENSING";

const recordId = () => crypto.randomUUID();
const correlation = () => crypto.randomUUID();
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function quantityMilli(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * THOUSAND + BigInt(fraction.padEnd(3, "0"));
}

function milliQuantity(value: bigint) {
  const sign = value < ZERO ? "-" : "";
  const absolute = value < ZERO ? -value : value;
  const whole = absolute / THOUSAND;
  const fraction = String(absolute % THOUSAND).padStart(3, "0").replace(/0+$/, "");
  return `${sign}${whole}${fraction ? `.${fraction}` : ""}`;
}

export type PharmacyBatchCandidate = {
  status: "active" | "quarantined" | "exhausted" | "expired";
  expiryAt: Date | null;
  availableQuantity: string;
};

/** Pure, non-clinical eligibility boundary. It never selects a medicine or a batch for a user. */
export function evaluatePharmacyBatch(candidate: PharmacyBatchCandidate | null, requestedQuantity: string, at = new Date()) {
  if (!candidate) return { eligible: false, reason: "The selected batch is not managed by the Pharmacy control path." } as const;
  if (candidate.status !== "active") return { eligible: false, reason: "The selected batch is not active for Pharmacy supply." } as const;
  if (!candidate.expiryAt) return { eligible: false, reason: "The selected batch requires an expiry date before Pharmacy supply." } as const;
  if (candidate.expiryAt.getTime() <= at.getTime()) return { eligible: false, reason: "The selected batch is expired and cannot be supplied." } as const;
  if (quantityMilli(candidate.availableQuantity) < quantityMilli(requestedQuantity)) return { eligible: false, reason: "The selected batch does not have enough available quantity." } as const;
  return { eligible: true, reason: "Batch is active, in date, and has sufficient Pharmacy-controlled availability." } as const;
}

export const pharmacySafety = { quantityMilli, milliQuantity, evaluatePharmacyBatch, ENABLE_CONFIRMATION, POLICY_NOTICE_VERSION };

async function scopedDb(input: { organisationId: string; branchId: string; userId: number; allowed: readonly any[] }) {
  const membership = await requireScopedMembership(input);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const [branch] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, input.branchId), eq(branches.organisationId, input.organisationId), eq(branches.isActive, 1))).limit(1);
  if (!branch) throw new TRPCError({ code: "NOT_FOUND", message: "The selected branch is not active in this organisation." });
  return { db, membership };
}

async function writeAudit(transaction: { insert: any }, input: { organisationId: string; branchId?: string; actorUserId: number; action: string; entityType: string; entityId: string; correlationId: string; metadata?: Record<string, unknown> }) {
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
    if (!cached) throw new TRPCError({ code: "CONFLICT", message: "This controlled action is still being processed." });
    return { ...cached, replayed: true };
  }
  const id = recordId();
  try {
    await db.insert(idempotencyKeys).values({ id, organisationId: input.organisationId, actorUserId: input.userId, action: input.action, idempotencyKey: input.idempotencyKey, requestHash });
  } catch {
    throw new TRPCError({ code: "CONFLICT", message: "This controlled action is already being processed." });
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

async function activePolicy(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, organisationId: string, branchId: string) {
  const [policy] = await db.select().from(pharmacyPolicies).where(eq(pharmacyPolicies.organisationId, organisationId)).limit(1);
  if (!policy?.isEnabled) throw new TRPCError({ code: "FORBIDDEN", message: "Pharmacy dispensing is disabled for this organisation. An owner must complete the governed activation first." });
  const activeAuthorisations = await db.select({ id: pharmacyPharmacistAuthorisations.id, expiresAt: pharmacyPharmacistAuthorisations.expiresAt }).from(pharmacyPharmacistAuthorisations).where(and(eq(pharmacyPharmacistAuthorisations.organisationId, organisationId), eq(pharmacyPharmacistAuthorisations.branchId, branchId), eq(pharmacyPharmacistAuthorisations.status, "active")));
  if (!activeAuthorisations.some(item => !item.expiresAt || item.expiresAt.getTime() > Date.now())) throw new TRPCError({ code: "FORBIDDEN", message: "This branch has no active pharmacist authorisation. Pharmacy writes remain blocked." });
  return policy;
}

async function batchCandidate(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: { organisationId: string; branchId: string; productId: string; stockLotId: string }) {
  const [row] = await db.select({ lotStatus: stockLots.status, expiryAt: stockLots.expiryAt, availableQuantity: pharmacyBatchBalances.availableQuantity }).from(stockLots).innerJoin(pharmacyBatchBalances, eq(pharmacyBatchBalances.stockLotId, stockLots.id)).where(and(eq(stockLots.id, input.stockLotId), eq(stockLots.organisationId, input.organisationId), eq(stockLots.branchId, input.branchId), eq(stockLots.productId, input.productId), eq(pharmacyBatchBalances.organisationId, input.organisationId), eq(pharmacyBatchBalances.branchId, input.branchId), eq(pharmacyBatchBalances.productId, input.productId))).limit(1);
  return row ? { status: row.lotStatus, expiryAt: row.expiryAt, availableQuantity: String(row.availableQuantity) } satisfies PharmacyBatchCandidate : null;
}

async function assertProduct(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: { organisationId: string; branchId: string; productId: string }) {
  const [product] = await db.select({ id: products.id, name: products.name, sku: products.sku }).from(products).where(and(eq(products.id, input.productId), eq(products.organisationId, input.organisationId), eq(products.branchId, input.branchId), eq(products.isActive, 1))).limit(1);
  if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "The requested product is not active in this branch." });
  return product;
}

async function assertLinesEligible(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: { organisationId: string; branchId: string; lines: Array<{ productId: string; stockLotId: string; quantity: string }> }) {
  const uniqueLots = new Set<string>();
  for (const line of input.lines) {
    if (uniqueLots.has(line.stockLotId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Each Pharmacy batch may appear only once in a dispensing request." });
    uniqueLots.add(line.stockLotId);
    await assertProduct(db, { ...input, productId: line.productId });
    const candidate = await batchCandidate(db, { ...input, productId: line.productId, stockLotId: line.stockLotId });
    const check = evaluatePharmacyBatch(candidate, line.quantity);
    if (!check.eligible) throw new TRPCError({ code: "BAD_REQUEST", message: check.reason });
  }
}

const lineInput = z.object({ productId: z.string().uuid(), stockLotId: z.string().uuid(), quantity: POSITIVE_QUANTITY });

export const pharmacyRouter = router({
  policy: router({
    status: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const [policyRows, pharmacists] = await Promise.all([
        db.select().from(pharmacyPolicies).where(eq(pharmacyPolicies.organisationId, input.organisationId)).limit(1),
        db.select().from(pharmacyPharmacistAuthorisations).where(and(eq(pharmacyPharmacistAuthorisations.organisationId, input.organisationId), eq(pharmacyPharmacistAuthorisations.branchId, input.branchId))).orderBy(desc(pharmacyPharmacistAuthorisations.authorisedAt)),
      ]);
      const policy = policyRows[0] ?? null;
      const now = new Date();
      const activePharmacists = pharmacists.filter(item => item.status === "active" && (!item.expiresAt || item.expiresAt.getTime() > now.getTime()));
      return { policy, activePharmacistCount: activePharmacists.length, activePharmacistUserIds: activePharmacists.map(item => item.userId), branchReady: Boolean(policy?.isEnabled) && activePharmacists.length > 0, noticeVersion: POLICY_NOTICE_VERSION };
    }),
    enable: protectedProcedure.input(scopeInput.extend({ acknowledgement: z.literal(ENABLE_CONFIRMATION), noticeVersion: z.literal(POLICY_NOTICE_VERSION) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: ["owner"] });
      const now = new Date();
      const authorisations = await db.select().from(pharmacyPharmacistAuthorisations).where(and(eq(pharmacyPharmacistAuthorisations.organisationId, input.organisationId), eq(pharmacyPharmacistAuthorisations.branchId, input.branchId), eq(pharmacyPharmacistAuthorisations.status, "active")));
      if (!authorisations.some(item => !item.expiresAt || item.expiresAt.getTime() > now.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Authorise at least one active pharmacist for this branch before enabling Pharmacy dispensing." });
      const [existingPolicy] = await db.select({ id: pharmacyPolicies.id }).from(pharmacyPolicies).where(eq(pharmacyPolicies.organisationId, input.organisationId)).limit(1);
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "pharmacy.policy.enable", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = existingPolicy?.id ?? recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(pharmacyPolicies).values({ id: entityId, organisationId: input.organisationId, isEnabled: 1, noticeVersion: input.noticeVersion, enabledAt: now, enabledByUserId: ctx.user.id, createdByUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { isEnabled: 1, noticeVersion: input.noticeVersion, enabledAt: now, enabledByUserId: ctx.user.id, disabledAt: null, disabledByUserId: null } });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "pharmacy.policy_enabled", entityType: "pharmacy_policy", entityId, correlationId, metadata: { noticeVersion: input.noticeVersion, acknowledgementMethod: "exact_typed_phrase" } });
        });
        return { entityId, correlationId };
      }});
    }),
    disable: protectedProcedure.input(scopeInput.extend({ reason: z.string().min(8).max(500) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: ["owner"] });
      const [policy] = await db.select().from(pharmacyPolicies).where(eq(pharmacyPolicies.organisationId, input.organisationId)).limit(1);
      if (!policy?.isEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "Pharmacy dispensing is already disabled." });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "pharmacy.policy.disable", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.update(pharmacyPolicies).set({ isEnabled: 0, disabledAt: new Date(), disabledByUserId: ctx.user.id }).where(eq(pharmacyPolicies.id, policy.id));
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "pharmacy.policy_disabled", entityType: "pharmacy_policy", entityId: policy.id, correlationId, metadata: { reason: input.reason.trim() } });
        });
        return { entityId: policy.id, correlationId };
      }});
    }),
  }),
  pharmacists: router({
    list: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      return db.select({ id: pharmacyPharmacistAuthorisations.id, userId: pharmacyPharmacistAuthorisations.userId, status: pharmacyPharmacistAuthorisations.status, expiresAt: pharmacyPharmacistAuthorisations.expiresAt, authorisedAt: pharmacyPharmacistAuthorisations.authorisedAt }).from(pharmacyPharmacistAuthorisations).where(and(eq(pharmacyPharmacistAuthorisations.organisationId, input.organisationId), eq(pharmacyPharmacistAuthorisations.branchId, input.branchId))).orderBy(desc(pharmacyPharmacistAuthorisations.authorisedAt));
    }),
    authorise: protectedProcedure.input(scopeInput.extend({ userId: z.number().int().positive(), credentialReference: z.string().min(4).max(160), expiresAt: z.coerce.date().optional() }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: ["owner"] });
      if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "A pharmacist authorisation expiry must be in the future." });
      await requireScopedMembership({ userId: input.userId, organisationId: input.organisationId, branchId: input.branchId, allowed: permissions.read });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "pharmacy.pharmacist.authorise", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const correlationId = correlation(); const now = new Date();
        await db.transaction(async transaction => {
          await transaction.insert(pharmacyPharmacistAuthorisations).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, userId: input.userId, credentialReference: input.credentialReference.trim(), status: "active", expiresAt: input.expiresAt, authorisedAt: now, authorisedByUserId: ctx.user.id, correlationId }).onDuplicateKeyUpdate({ set: { credentialReference: input.credentialReference.trim(), status: "active", expiresAt: input.expiresAt, authorisedAt: now, authorisedByUserId: ctx.user.id, revokedAt: null, revokedByUserId: null, revocationReason: null, correlationId } });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "pharmacy.pharmacist_authorised", entityType: "pharmacy_pharmacist_authorisation", entityId, correlationId, metadata: { pharmacistUserId: input.userId, credentialReference: input.credentialReference.trim(), expiresAt: input.expiresAt?.toISOString() ?? null, attestation: "owner_recorded" } });
        });
        return { entityId, correlationId };
      }});
    }),
  }),
  batches: router({
    list: protectedProcedure.input(scopeInput.extend({ productId: z.string().uuid().optional() })).query(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const lots = await db.select({ id: stockLots.id, productId: stockLots.productId, batchCode: stockLots.batchCode, expiryAt: stockLots.expiryAt, status: stockLots.status, availableQuantity: pharmacyBatchBalances.availableQuantity, productName: products.name, sku: products.sku }).from(stockLots).innerJoin(pharmacyBatchBalances, eq(pharmacyBatchBalances.stockLotId, stockLots.id)).innerJoin(products, eq(products.id, stockLots.productId)).where(and(eq(stockLots.organisationId, input.organisationId), eq(stockLots.branchId, input.branchId), eq(pharmacyBatchBalances.organisationId, input.organisationId), eq(pharmacyBatchBalances.branchId, input.branchId))).orderBy(stockLots.expiryAt);
      return input.productId ? lots.filter(lot => lot.productId === input.productId) : lots;
    }),
    receive: protectedProcedure.input(scopeInput.extend({ productId: z.string().uuid(), batchCode: z.string().min(2).max(96), expiryAt: z.coerce.date(), quantity: POSITIVE_QUANTITY, receiptReference: z.string().min(3).max(160) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageInventory });
      await activePolicy(db, input.organisationId, input.branchId);
      if (input.expiryAt.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "A Pharmacy batch expiry date must be in the future." });
      await assertProduct(db, input);
      const normalisedBatch = input.batchCode.trim().toUpperCase();
      const [existing] = await db.select({ id: stockLots.id }).from(stockLots).where(and(eq(stockLots.organisationId, input.organisationId), eq(stockLots.branchId, input.branchId), eq(stockLots.productId, input.productId), eq(stockLots.batchCode, normalisedBatch))).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "This Pharmacy batch already exists. Use a governed correction process rather than changing a recorded receipt." });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "pharmacy.batch.receive", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const lotId = recordId(); const balanceId = recordId(); const movementId = recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(stockLots).values({ id: lotId, organisationId: input.organisationId, branchId: input.branchId, productId: input.productId, batchCode: normalisedBatch, expiryAt: input.expiryAt, status: "active", createdByUserId: ctx.user.id });
          await transaction.insert(pharmacyBatchBalances).values({ id: balanceId, organisationId: input.organisationId, branchId: input.branchId, productId: input.productId, stockLotId: lotId, availableQuantity: input.quantity });
          await transaction.insert(stockMovements).values({ id: movementId, organisationId: input.organisationId, branchId: input.branchId, productId: input.productId, stockLotId: lotId, movementType: "receipt", quantityDelta: input.quantity, reason: `Pharmacy receipt ${input.receiptReference.trim()}`, occurredAt: new Date(), correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "pharmacy.batch_received", entityType: "stock_lot", entityId: lotId, correlationId, metadata: { productId: input.productId, batchCode: normalisedBatch, expiryAt: input.expiryAt.toISOString(), quantity: input.quantity, receiptReference: input.receiptReference.trim() } });
        });
        return { entityId: lotId, correlationId };
      }});
    }),
    validate: protectedProcedure.input(scopeInput.extend({ productId: z.string().uuid().optional(), stockLotId: z.string().uuid().optional(), quantity: POSITIVE_QUANTITY.optional() })).query(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const [policy] = await db.select().from(pharmacyPolicies).where(eq(pharmacyPolicies.organisationId, input.organisationId)).limit(1);
      const authorisations = await db.select({ expiresAt: pharmacyPharmacistAuthorisations.expiresAt }).from(pharmacyPharmacistAuthorisations).where(and(eq(pharmacyPharmacistAuthorisations.organisationId, input.organisationId), eq(pharmacyPharmacistAuthorisations.branchId, input.branchId), eq(pharmacyPharmacistAuthorisations.status, "active")));
      const branchReady = Boolean(policy?.isEnabled) && authorisations.some(item => !item.expiresAt || item.expiresAt.getTime() > Date.now());
      if (!input.productId || !input.stockLotId || !input.quantity) return { eligible: false, reason: "Choose a Pharmacy-managed product, batch, and quantity to validate availability.", policyEnabled: Boolean(policy?.isEnabled), branchReady };
      const candidate = await batchCandidate(db, { ...input, productId: input.productId, stockLotId: input.stockLotId });
      const result = evaluatePharmacyBatch(candidate, input.quantity);
      return { ...result, policyEnabled: Boolean(policy?.isEnabled), branchReady, candidate: candidate ? { ...candidate, availableQuantity: candidate.availableQuantity } : null };
    }),
  }),
  dispensing: router({
    list: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const requests = await db.select().from(pharmacyDispensingRequests).where(and(eq(pharmacyDispensingRequests.organisationId, input.organisationId), eq(pharmacyDispensingRequests.branchId, input.branchId))).orderBy(desc(pharmacyDispensingRequests.createdAt));
      if (!requests.length) return [];
      const requestIds = requests.map(request => request.id);
      const [lines, decisions] = await Promise.all([
        db.select({ id: pharmacyDispensingLines.id, dispensingRequestId: pharmacyDispensingLines.dispensingRequestId, productId: pharmacyDispensingLines.productId, stockLotId: pharmacyDispensingLines.stockLotId, quantity: pharmacyDispensingLines.quantity, productName: products.name, batchCode: stockLots.batchCode, expiryAt: stockLots.expiryAt }).from(pharmacyDispensingLines).innerJoin(products, eq(products.id, pharmacyDispensingLines.productId)).innerJoin(stockLots, eq(stockLots.id, pharmacyDispensingLines.stockLotId)).where(inArray(pharmacyDispensingLines.dispensingRequestId, requestIds)),
        db.select().from(pharmacyDispensingDecisions).where(inArray(pharmacyDispensingDecisions.dispensingRequestId, requestIds)).orderBy(desc(pharmacyDispensingDecisions.createdAt)),
      ]);
      return requests.map(request => ({ ...request, lines: lines.filter(line => line.dispensingRequestId === request.id), decisions: decisions.filter(decision => decision.dispensingRequestId === request.id) }));
    }),
    createDraft: protectedProcedure.input(scopeInput.extend({ sourceReference: z.string().min(3).max(128), lines: z.array(lineInput).min(1).max(20) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageOrders });
      await activePolicy(db, input.organisationId, input.branchId);
      await assertLinesEligible(db, input);
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "pharmacy.dispensing.create_draft", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(pharmacyDispensingRequests).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, sourceReference: input.sourceReference.trim(), status: "draft", correlationId, createdByUserId: ctx.user.id });
          await transaction.insert(pharmacyDispensingLines).values(input.lines.map(line => ({ id: recordId(), dispensingRequestId: entityId, organisationId: input.organisationId, branchId: input.branchId, productId: line.productId, stockLotId: line.stockLotId, quantity: line.quantity })));
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "pharmacy.dispensing_draft_created", entityType: "pharmacy_dispensing_request", entityId, correlationId, metadata: { sourceReference: input.sourceReference.trim(), lineCount: input.lines.length, clinicalDataStored: false } });
        });
        return { entityId, correlationId };
      }});
    }),
    submitForReview: protectedProcedure.input(scopeInput.extend({ dispensingRequestId: z.string().uuid(), rationale: z.string().min(8).max(4000) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageOrders });
      await activePolicy(db, input.organisationId, input.branchId);
      const [request] = await db.select().from(pharmacyDispensingRequests).where(and(eq(pharmacyDispensingRequests.id, input.dispensingRequestId), eq(pharmacyDispensingRequests.organisationId, input.organisationId), eq(pharmacyDispensingRequests.branchId, input.branchId))).limit(1);
      if (!request || !["draft", "returned"].includes(request.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Only a draft or returned Pharmacy request can be submitted for pharmacist review." });
      if (request.createdByUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the originating operator may submit this Pharmacy request for review." });
      const lines = await db.select({ productId: pharmacyDispensingLines.productId, stockLotId: pharmacyDispensingLines.stockLotId, quantity: pharmacyDispensingLines.quantity }).from(pharmacyDispensingLines).where(eq(pharmacyDispensingLines.dispensingRequestId, request.id));
      await assertLinesEligible(db, { ...input, lines: lines.map(line => ({ ...line, quantity: String(line.quantity) })) });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "pharmacy.dispensing.submit", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.update(pharmacyDispensingRequests).set({ status: "pending_review", submittedAt: new Date() }).where(eq(pharmacyDispensingRequests.id, request.id));
          await transaction.insert(pharmacyDispensingDecisions).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, dispensingRequestId: request.id, decision: "submitted", rationale: input.rationale.trim(), correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "pharmacy.dispensing_submitted_for_review", entityType: "pharmacy_dispensing_request", entityId: request.id, correlationId, metadata: { lineCount: lines.length } });
        });
        return { entityId: request.id, correlationId };
      }});
    }),
    decideReview: protectedProcedure.input(scopeInput.extend({ dispensingRequestId: z.string().uuid(), decision: z.enum(["approved", "returned", "rejected"]), rationale: z.string().min(8).max(4000) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      await activePolicy(db, input.organisationId, input.branchId);
      const [requestRows, authorisationRows] = await Promise.all([
        db.select().from(pharmacyDispensingRequests).where(and(eq(pharmacyDispensingRequests.id, input.dispensingRequestId), eq(pharmacyDispensingRequests.organisationId, input.organisationId), eq(pharmacyDispensingRequests.branchId, input.branchId))).limit(1),
        db.select().from(pharmacyPharmacistAuthorisations).where(and(eq(pharmacyPharmacistAuthorisations.organisationId, input.organisationId), eq(pharmacyPharmacistAuthorisations.branchId, input.branchId), eq(pharmacyPharmacistAuthorisations.userId, ctx.user.id), eq(pharmacyPharmacistAuthorisations.status, "active"))).limit(1),
      ]);
      const request = requestRows[0];
      const authorisation = authorisationRows[0];
      if (!request || request.status !== "pending_review") throw new TRPCError({ code: "BAD_REQUEST", message: "Only a pending Pharmacy request can receive a pharmacist review decision." });
      if (!authorisation || (authorisation.expiresAt && authorisation.expiresAt.getTime() <= Date.now())) throw new TRPCError({ code: "FORBIDDEN", message: "An active pharmacist authorisation is required for this branch review decision." });
      if (request.createdByUserId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "The originating operator cannot review their own Pharmacy request." });
      const lines = await db.select({ productId: pharmacyDispensingLines.productId, stockLotId: pharmacyDispensingLines.stockLotId, quantity: pharmacyDispensingLines.quantity }).from(pharmacyDispensingLines).where(eq(pharmacyDispensingLines.dispensingRequestId, request.id));
      if (input.decision === "approved") await assertLinesEligible(db, { ...input, lines: lines.map(line => ({ ...line, quantity: String(line.quantity) })) });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "pharmacy.dispensing.review", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const correlationId = correlation(); const status = input.decision === "approved" ? "approved_for_supply" : input.decision;
        await db.transaction(async transaction => {
          await transaction.update(pharmacyDispensingRequests).set({ status }).where(and(eq(pharmacyDispensingRequests.id, request.id), eq(pharmacyDispensingRequests.status, "pending_review")));
          await transaction.insert(pharmacyDispensingDecisions).values({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, dispensingRequestId: request.id, decision: input.decision, rationale: input.rationale.trim(), pharmacistAuthorisationId: authorisation.id, correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: `pharmacy.dispensing_${input.decision}`, entityType: "pharmacy_dispensing_request", entityId: request.id, correlationId, metadata: { pharmacistAuthorisationId: authorisation.id, lineCount: lines.length } });
        });
        return { entityId: request.id, correlationId };
      }});
    }),
    recordSupply: protectedProcedure.input(scopeInput.extend({ dispensingRequestId: z.string().uuid(), suppliedAt: z.coerce.date() }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const { db } = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageOrders });
      await activePolicy(db, input.organisationId, input.branchId);
      const [request] = await db.select().from(pharmacyDispensingRequests).where(and(eq(pharmacyDispensingRequests.id, input.dispensingRequestId), eq(pharmacyDispensingRequests.organisationId, input.organisationId), eq(pharmacyDispensingRequests.branchId, input.branchId))).limit(1);
      if (!request || request.status !== "approved_for_supply") throw new TRPCError({ code: "BAD_REQUEST", message: "Only a pharmacist-approved Pharmacy request may record supply." });
      const lines = await db.select({ productId: pharmacyDispensingLines.productId, stockLotId: pharmacyDispensingLines.stockLotId, quantity: pharmacyDispensingLines.quantity }).from(pharmacyDispensingLines).where(eq(pharmacyDispensingLines.dispensingRequestId, request.id));
      await assertLinesEligible(db, { ...input, lines: lines.map(line => ({ ...line, quantity: String(line.quantity) })) });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "pharmacy.dispensing.record_supply", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const eventId = recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(pharmacySupplyEvents).values({ id: eventId, organisationId: input.organisationId, branchId: input.branchId, dispensingRequestId: request.id, suppliedAt: input.suppliedAt, correlationId, createdByUserId: ctx.user.id });
          for (const line of lines) {
            const updateResult = await transaction.update(pharmacyBatchBalances).set({ availableQuantity: sql`${pharmacyBatchBalances.availableQuantity} - ${String(line.quantity)}` }).where(and(eq(pharmacyBatchBalances.stockLotId, line.stockLotId), eq(pharmacyBatchBalances.organisationId, input.organisationId), eq(pharmacyBatchBalances.branchId, input.branchId), eq(pharmacyBatchBalances.productId, line.productId), gte(pharmacyBatchBalances.availableQuantity, String(line.quantity))));
            if (Number((updateResult as { affectedRows?: number }).affectedRows ?? 0) !== 1) throw new TRPCError({ code: "CONFLICT", message: "A Pharmacy batch changed while supply was being recorded. Review the request again before retrying." });
          }
          await transaction.insert(stockMovements).values(lines.map(line => ({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, productId: line.productId, stockLotId: line.stockLotId, movementType: "pharmacy_supply" as const, quantityDelta: milliQuantity(-quantityMilli(String(line.quantity))), reason: `Pharmacy supply ${request.sourceReference}`, occurredAt: input.suppliedAt, correlationId, createdByUserId: ctx.user.id })));
          await transaction.update(pharmacyDispensingRequests).set({ status: "supplied", suppliedAt: input.suppliedAt }).where(and(eq(pharmacyDispensingRequests.id, request.id), eq(pharmacyDispensingRequests.status, "approved_for_supply")));
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "pharmacy.supply_recorded", entityType: "pharmacy_supply_event", entityId: eventId, correlationId, metadata: { dispensingRequestId: request.id, sourceReference: request.sourceReference, lineCount: lines.length } });
        });
        return { entityId: eventId, correlationId };
      }});
    }),
  }),
});
