import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  auditEvents,
  branches,
  collectionFollowUps,
  customerOrderLines,
  customerOrders,
  customers,
  deliveries,
  deliveryLines,
  evidenceFiles,
  evidenceRetentionReviews,
  evidenceStorageRemediations,
  idempotencyKeys,
  invoices,
  products,
  receivableObligations,
  reconciliationLinks,
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
const wholeMinor = z.string().regex(/^\d+$/, "Use exact positive minor units without decimals.").refine(value => BigInt(value) > ZERO, "Value must be positive.");
const positiveQuantity = z.string().regex(/^\d+(\.\d{1,3})?$/, "Use a positive quantity with at most three decimal places.").refine(value => quantityMilli(value) > ZERO, "Quantity must be positive.");
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

function lineValueMinor(lines: Array<{ quantity: string; unitPriceMinor: string }>) {
  return lines.reduce((total, line) => {
    const numerator = quantityMilli(line.quantity) * BigInt(line.unitPriceMinor);
    if (numerator % THOUSAND !== ZERO) throw new TRPCError({ code: "BAD_REQUEST", message: "Line quantity and unit price do not produce an exact minor-unit invoice total." });
    return total + numerator / THOUSAND;
  }, ZERO);
}

export const release2Math = { quantityMilli, milliQuantity, lineValueMinor };

async function scopedDb(input: { organisationId: string; branchId: string; userId: number; allowed: readonly any[] }) {
  await requireScopedMembership(input);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const [branch] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, input.branchId), eq(branches.organisationId, input.organisationId), eq(branches.isActive, 1))).limit(1);
  if (!branch) throw new TRPCError({ code: "NOT_FOUND", message: "The selected branch is not active in this organisation." });
  return db;
}

async function writeAudit(transaction: { insert: any }, input: {
  organisationId: string; branchId?: string; actorUserId: number; action: string; entityType: string; entityId: string; correlationId: string; metadata?: Record<string, unknown>;
}) {
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

async function productInScope(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: { productId: string; organisationId: string; branchId: string }) {
  const [product] = await db.select().from(products).where(and(eq(products.id, input.productId), eq(products.organisationId, input.organisationId), eq(products.branchId, input.branchId), eq(products.isActive, 1))).limit(1);
  if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product is not active in the selected branch." });
  return product;
}

async function stockAvailableMilli(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, input: { organisationId: string; branchId: string; productId: string; stockLotId?: string | null }) {
  const rows = await db.select({ quantityDelta: stockMovements.quantityDelta, stockLotId: stockMovements.stockLotId }).from(stockMovements).where(and(eq(stockMovements.organisationId, input.organisationId), eq(stockMovements.branchId, input.branchId), eq(stockMovements.productId, input.productId)));
  return rows.filter(row => input.stockLotId ? row.stockLotId === input.stockLotId : true).reduce((total, row) => total + quantityMilli(String(row.quantityDelta)), ZERO);
}

const lineInput = z.object({ productId: z.string().uuid(), quantity: positiveQuantity, unitPriceMinor: wholeMinor, currency: z.string().length(3).transform(value => value.toUpperCase()) });

export const release2Router = router({
  products: router({
    list: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const rows = await db.select().from(products).where(and(eq(products.organisationId, input.organisationId), eq(products.branchId, input.branchId))).orderBy(desc(products.createdAt));
      const movementRows = await db.select({ productId: stockMovements.productId, quantityDelta: stockMovements.quantityDelta }).from(stockMovements).where(and(eq(stockMovements.organisationId, input.organisationId), eq(stockMovements.branchId, input.branchId)));
      const positions = new Map<string, bigint>();
      movementRows.forEach(row => positions.set(row.productId, (positions.get(row.productId) ?? ZERO) + quantityMilli(String(row.quantityDelta))));
      return rows.map(row => ({ ...row, availableQuantity: milliQuantity(positions.get(row.id) ?? ZERO), lowStock: (positions.get(row.id) ?? ZERO) <= quantityMilli(String(row.reorderPointQuantity)) }));
    }),
    create: protectedProcedure.input(scopeInput.extend({ sku: z.string().min(2).max(96), name: z.string().min(2).max(180), unitOfMeasure: z.string().min(1).max(32).default("unit"), reorderPointQuantity: z.string().regex(/^\d+(\.\d{1,3})?$/).default("0") }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageProducts });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release2.product.create", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(products).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, sku: input.sku.trim().toUpperCase(), name: input.name.trim(), unitOfMeasure: input.unitOfMeasure.trim(), reorderPointQuantity: input.reorderPointQuantity, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release2.product_created", entityType: "product", entityId, correlationId, metadata: { sku: input.sku.trim().toUpperCase(), name: input.name.trim() } });
        });
        return { entityId, correlationId };
      }});
    }),
  }),
  inventory: router({
    lots: protectedProcedure.input(scopeInput.extend({ productId: z.string().uuid() })).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      await productInScope(db, input);
      return db.select().from(stockLots).where(and(eq(stockLots.organisationId, input.organisationId), eq(stockLots.branchId, input.branchId), eq(stockLots.productId, input.productId))).orderBy(desc(stockLots.createdAt));
    }),
    movements: protectedProcedure.input(scopeInput.extend({ productId: z.string().uuid().optional() })).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const rows = await db.select().from(stockMovements).where(and(eq(stockMovements.organisationId, input.organisationId), eq(stockMovements.branchId, input.branchId))).orderBy(desc(stockMovements.occurredAt));
      return input.productId ? rows.filter(row => row.productId === input.productId) : rows;
    }),
    receive: protectedProcedure.input(scopeInput.extend({ productId: z.string().uuid(), quantity: positiveQuantity, batchCode: z.string().min(2).max(96).optional(), expiryAt: z.coerce.date().optional(), reason: z.string().min(3).max(500) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageInventory });
      await productInScope(db, input);
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release2.stock.receive", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const correlationId = correlation(); let lotId: string | undefined;
        await db.transaction(async transaction => {
          if (input.batchCode) {
            const [existing] = await db.select().from(stockLots).where(and(eq(stockLots.organisationId, input.organisationId), eq(stockLots.branchId, input.branchId), eq(stockLots.productId, input.productId), eq(stockLots.batchCode, input.batchCode.trim().toUpperCase()))).limit(1);
            lotId = existing?.id ?? recordId();
            if (!existing) await transaction.insert(stockLots).values({ id: lotId, organisationId: input.organisationId, branchId: input.branchId, productId: input.productId, batchCode: input.batchCode.trim().toUpperCase(), expiryAt: input.expiryAt, createdByUserId: ctx.user.id });
          }
          await transaction.insert(stockMovements).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, productId: input.productId, stockLotId: lotId, movementType: "receipt", quantityDelta: input.quantity, reason: input.reason, occurredAt: new Date(), correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release2.stock_received", entityType: "stock_movement", entityId, correlationId, metadata: { productId: input.productId, quantity: input.quantity, batchCode: input.batchCode ?? null } });
        });
        return { entityId, correlationId };
      }});
    }),
    transfer: protectedProcedure.input(scopeInput.extend({ destinationBranchId: z.string().uuid(), productId: z.string().uuid(), quantity: positiveQuantity, transferReference: z.string().min(3).max(96), reason: z.string().min(3).max(500) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      if (input.destinationBranchId === input.branchId) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a different destination branch for a stock transfer." });
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageInventory });
      await requireScopedMembership({ userId: ctx.user.id, organisationId: input.organisationId, branchId: input.destinationBranchId, allowed: permissions.manageInventory });
      await productInScope(db, input);
      const available = await stockAvailableMilli(db, input);
      if (available < quantityMilli(input.quantity)) throw new TRPCError({ code: "BAD_REQUEST", message: "The source branch does not have enough available stock for this transfer." });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release2.stock.transfer", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const incomingId = recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(stockMovements).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, productId: input.productId, movementType: "transfer_out", quantityDelta: milliQuantity(-quantityMilli(input.quantity)), transferReference: input.transferReference.trim(), reason: input.reason, occurredAt: new Date(), correlationId, createdByUserId: ctx.user.id });
          await transaction.insert(stockMovements).values({ id: incomingId, organisationId: input.organisationId, branchId: input.destinationBranchId, productId: input.productId, movementType: "transfer_in", quantityDelta: input.quantity, transferReference: input.transferReference.trim(), reason: input.reason, occurredAt: new Date(), correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release2.stock_transferred", entityType: "stock_movement", entityId, correlationId, metadata: { productId: input.productId, quantity: input.quantity, destinationBranchId: input.destinationBranchId, transferReference: input.transferReference.trim() } });
        });
        return { entityId, correlationId };
      }});
    }),
  }),
  orders: router({
    list: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      return db.select().from(customerOrders).where(and(eq(customerOrders.organisationId, input.organisationId), eq(customerOrders.branchId, input.branchId))).orderBy(desc(customerOrders.orderedAt));
    }),
    lines: protectedProcedure.input(scopeInput.extend({ orderId: z.string().uuid() })).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      return db.select().from(customerOrderLines).where(and(eq(customerOrderLines.organisationId, input.organisationId), eq(customerOrderLines.branchId, input.branchId), eq(customerOrderLines.orderId, input.orderId)));
    }),
    create: protectedProcedure.input(scopeInput.extend({ customerId: z.string().uuid(), orderNumber: z.string().min(2).max(96), expectedDeliveryAt: z.coerce.date().optional(), note: z.string().max(500).optional(), lines: z.array(lineInput).min(1).max(50) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageOrders });
      const [customer] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, input.customerId), eq(customers.organisationId, input.organisationId), eq(customers.branchId, input.branchId))).limit(1);
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer is not in the selected branch." });
      const productRows = await db.select({ id: products.id }).from(products).where(and(eq(products.organisationId, input.organisationId), eq(products.branchId, input.branchId), eq(products.isActive, 1)));
      const productIds = new Set(productRows.map(row => row.id));
      if (input.lines.some(line => !productIds.has(line.productId))) throw new TRPCError({ code: "NOT_FOUND", message: "Every order line must use an active branch product." });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release2.order.create", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(customerOrders).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, customerId: input.customerId, orderNumber: input.orderNumber.trim().toUpperCase(), status: "confirmed", expectedDeliveryAt: input.expectedDeliveryAt, note: input.note, correlationId, createdByUserId: ctx.user.id });
          await transaction.insert(customerOrderLines).values(input.lines.map(line => ({ id: recordId(), orderId: entityId, organisationId: input.organisationId, branchId: input.branchId, productId: line.productId, quantity: line.quantity, unitPriceMinor: line.unitPriceMinor, currency: line.currency })));
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release2.order_confirmed", entityType: "customer_order", entityId, correlationId, metadata: { customerId: input.customerId, orderNumber: input.orderNumber.trim().toUpperCase(), lineCount: input.lines.length } });
        });
        return { entityId, correlationId };
      }});
    }),
  }),
  deliveries: router({
    list: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      return db.select().from(deliveries).where(and(eq(deliveries.organisationId, input.organisationId), eq(deliveries.branchId, input.branchId))).orderBy(desc(deliveries.deliveredAt));
    }),
    create: protectedProcedure.input(scopeInput.extend({ orderId: z.string().uuid(), deliveryNumber: z.string().min(2).max(96), recipientName: z.string().max(180).optional(), note: z.string().max(500).optional(), deliveredAt: z.coerce.date(), lines: z.array(z.object({ productId: z.string().uuid(), stockLotId: z.string().uuid().optional(), quantity: positiveQuantity })).min(1).max(50) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageOrders });
      const [order] = await db.select().from(customerOrders).where(and(eq(customerOrders.id, input.orderId), eq(customerOrders.organisationId, input.organisationId), eq(customerOrders.branchId, input.branchId))).limit(1);
      if (!order || !["confirmed", "delivered"].includes(order.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Only a confirmed order can receive a delivery record." });
      const orderLines = await db.select().from(customerOrderLines).where(eq(customerOrderLines.orderId, order.id));
      const ordered = new Map(orderLines.map(line => [line.productId, quantityMilli(String(line.quantity))]));
      if (input.lines.some(line => !ordered.has(line.productId) || quantityMilli(line.quantity) > (ordered.get(line.productId) ?? ZERO))) throw new TRPCError({ code: "BAD_REQUEST", message: "A delivery line cannot exceed the product quantity on its order." });
      for (const line of input.lines) {
        await productInScope(db, { ...input, productId: line.productId });
        if (line.stockLotId) {
          const [lot] = await db.select().from(stockLots).where(and(eq(stockLots.id, line.stockLotId), eq(stockLots.organisationId, input.organisationId), eq(stockLots.branchId, input.branchId), eq(stockLots.productId, line.productId), eq(stockLots.status, "active"))).limit(1);
          if (!lot) throw new TRPCError({ code: "NOT_FOUND", message: "Delivery batch is not active in the selected branch." });
        }
        const available = await stockAvailableMilli(db, { ...input, productId: line.productId, stockLotId: line.stockLotId });
        if (available < quantityMilli(line.quantity)) throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient available stock for this delivery line." });
      }
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release2.delivery.create", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(deliveries).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, orderId: input.orderId, deliveryNumber: input.deliveryNumber.trim().toUpperCase(), status: "confirmed", deliveredAt: input.deliveredAt, recipientName: input.recipientName, note: input.note, correlationId, createdByUserId: ctx.user.id });
          await transaction.insert(deliveryLines).values(input.lines.map(line => ({ id: recordId(), deliveryId: entityId, organisationId: input.organisationId, branchId: input.branchId, productId: line.productId, stockLotId: line.stockLotId, quantity: line.quantity })));
          await transaction.insert(stockMovements).values(input.lines.map(line => ({ id: recordId(), organisationId: input.organisationId, branchId: input.branchId, productId: line.productId, stockLotId: line.stockLotId, movementType: "delivery" as const, quantityDelta: milliQuantity(-quantityMilli(line.quantity)), deliveryId: entityId, reason: `Delivery ${input.deliveryNumber.trim().toUpperCase()}`, occurredAt: input.deliveredAt, correlationId, createdByUserId: ctx.user.id })));
          await transaction.update(customerOrders).set({ status: "delivered" }).where(eq(customerOrders.id, input.orderId));
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release2.delivery_confirmed", entityType: "delivery", entityId, correlationId, metadata: { orderId: input.orderId, deliveryNumber: input.deliveryNumber.trim().toUpperCase(), lineCount: input.lines.length } });
        });
        return { entityId, correlationId };
      }});
    }),
  }),
  invoices: router({
    list: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      return db.select().from(invoices).where(and(eq(invoices.organisationId, input.organisationId), eq(invoices.branchId, input.branchId))).orderBy(desc(invoices.issuedAt));
    }),
    issue: protectedProcedure.input(scopeInput.extend({ orderId: z.string().uuid(), deliveryId: z.string().uuid().optional(), invoiceNumber: z.string().min(2).max(96), dueAt: z.coerce.date().optional() }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageOrders });
      const [order] = await db.select().from(customerOrders).where(and(eq(customerOrders.id, input.orderId), eq(customerOrders.organisationId, input.organisationId), eq(customerOrders.branchId, input.branchId))).limit(1);
      if (!order || order.status !== "delivered") throw new TRPCError({ code: "BAD_REQUEST", message: "A confirmed delivery is required before issuing an invoice." });
      if (input.deliveryId) {
        const [delivery] = await db.select().from(deliveries).where(and(eq(deliveries.id, input.deliveryId), eq(deliveries.orderId, order.id), eq(deliveries.status, "confirmed"))).limit(1);
        if (!delivery) throw new TRPCError({ code: "NOT_FOUND", message: "The selected confirmed delivery does not belong to this order." });
      }
      const lines = await db.select({ quantity: customerOrderLines.quantity, unitPriceMinor: customerOrderLines.unitPriceMinor, currency: customerOrderLines.currency }).from(customerOrderLines).where(eq(customerOrderLines.orderId, order.id));
      if (!lines.length || new Set(lines.map(line => line.currency)).size !== 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Order lines must contain a single currency before invoice issuance." });
      const amountMinor = lineValueMinor(lines.map(line => ({ quantity: String(line.quantity), unitPriceMinor: String(line.unitPriceMinor) })));
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release2.invoice.issue", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const obligationId = recordId(); const correlationId = correlation(); const invoiceNumber = input.invoiceNumber.trim().toUpperCase();
        await db.transaction(async transaction => {
          await transaction.insert(receivableObligations).values({ id: obligationId, organisationId: input.organisationId, branchId: input.branchId, customerId: order.customerId, reference: invoiceNumber, amountMinor: amountMinor.toString(), currency: lines[0]!.currency, dueAt: input.dueAt, status: "open", sourceType: "release2_invoice", sourceReference: order.orderNumber, sourceMetadata: { orderId: order.id, deliveryId: input.deliveryId ?? null }, correlationId, createdByUserId: ctx.user.id });
          await transaction.insert(invoices).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, customerId: order.customerId, orderId: order.id, deliveryId: input.deliveryId, obligationId, invoiceNumber, amountMinor: amountMinor.toString(), currency: lines[0]!.currency, correlationId, createdByUserId: ctx.user.id });
          await transaction.update(customerOrders).set({ status: "invoiced" }).where(eq(customerOrders.id, order.id));
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release2.invoice_issued", entityType: "invoice", entityId, correlationId, metadata: { orderId: order.id, obligationId, invoiceNumber, amountMinor: amountMinor.toString(), currency: lines[0]!.currency } });
        });
        return { entityId, correlationId };
      }});
    }),
  }),
  collections: router({
    queue: protectedProcedure.input(scopeInput).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const [obligations, links, customerRows, followUps] = await Promise.all([
        db.select().from(receivableObligations).where(and(eq(receivableObligations.organisationId, input.organisationId), eq(receivableObligations.branchId, input.branchId))),
        db.select().from(reconciliationLinks).where(eq(reconciliationLinks.organisationId, input.organisationId)),
        db.select().from(customers).where(and(eq(customers.organisationId, input.organisationId), eq(customers.branchId, input.branchId))),
        db.select().from(collectionFollowUps).where(and(eq(collectionFollowUps.organisationId, input.organisationId), eq(collectionFollowUps.branchId, input.branchId))).orderBy(desc(collectionFollowUps.createdAt)),
      ]);
      const customerById = new Map(customerRows.map(row => [row.id, row]));
      const paidByObligation = new Map<string, bigint>();
      links.forEach(link => paidByObligation.set(link.obligationId, (paidByObligation.get(link.obligationId) ?? ZERO) + BigInt(String(link.allocatedMinor))));
      return obligations.map(obligation => {
        const outstanding = BigInt(String(obligation.amountMinor)) - (paidByObligation.get(obligation.id) ?? ZERO);
        const latestFollowUp = followUps.find(item => item.obligationId === obligation.id && item.status !== "closed");
        return { id: obligation.id, customerId: obligation.customerId, reference: obligation.reference, customerName: customerById.get(obligation.customerId)?.name ?? "Unknown customer", currency: obligation.currency, dueAt: obligation.dueAt, outstandingMinor: outstanding > ZERO ? outstanding.toString() : "0", status: obligation.status, latestFollowUp };
      }).filter(item => item.outstandingMinor !== "0").sort((a, b) => Number(BigInt(b.outstandingMinor) - BigInt(a.outstandingMinor)));
    }),
    statement: protectedProcedure.input(scopeInput.extend({ customerId: z.string().uuid() })).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.read });
      const [customer] = await db.select().from(customers).where(and(eq(customers.id, input.customerId), eq(customers.organisationId, input.organisationId), eq(customers.branchId, input.branchId))).limit(1);
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer is not in the selected branch." });
      const obligations = await db.select().from(receivableObligations).where(and(eq(receivableObligations.organisationId, input.organisationId), eq(receivableObligations.branchId, input.branchId), eq(receivableObligations.customerId, input.customerId))).orderBy(desc(receivableObligations.createdAt));
      const links = await db.select().from(reconciliationLinks).where(eq(reconciliationLinks.organisationId, input.organisationId));
      const paidByObligation = new Map<string, bigint>();
      links.forEach(link => paidByObligation.set(link.obligationId, (paidByObligation.get(link.obligationId) ?? ZERO) + BigInt(String(link.allocatedMinor))));
      return { customer, entries: obligations.map(obligation => ({ ...obligation, allocatedMinor: (paidByObligation.get(obligation.id) ?? ZERO).toString(), outstandingMinor: (BigInt(String(obligation.amountMinor)) - (paidByObligation.get(obligation.id) ?? ZERO)).toString() })) };
    }),
    addFollowUp: protectedProcedure.input(scopeInput.extend({ customerId: z.string().uuid(), obligationId: z.string().uuid(), reason: z.enum(["partial_payment", "pending_bank", "customer_dispute", "reconciliation_required", "other"]), note: z.string().min(4).max(4000), nextActionAt: z.coerce.date().optional() }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageCollections });
      const [obligation] = await db.select().from(receivableObligations).where(and(eq(receivableObligations.id, input.obligationId), eq(receivableObligations.customerId, input.customerId), eq(receivableObligations.organisationId, input.organisationId), eq(receivableObligations.branchId, input.branchId))).limit(1);
      if (!obligation) throw new TRPCError({ code: "NOT_FOUND", message: "Collection follow-up must belong to a receivable for this customer and branch." });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release2.collection.follow_up", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(collectionFollowUps).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, customerId: input.customerId, obligationId: input.obligationId, reason: input.reason, note: input.note, nextActionAt: input.nextActionAt, correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release2.collection_follow_up_added", entityType: "collection_follow_up", entityId, correlationId, metadata: { customerId: input.customerId, obligationId: input.obligationId, reason: input.reason } });
        });
        return { entityId, correlationId };
      }});
    }),
  }),
  evidenceGovernance: router({
    storageRemediations: protectedProcedure.input(scopeInput.extend({ evidenceFileId: z.string().uuid().optional() })).query(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageEvidenceGovernance });
      const rows = await db.select().from(evidenceStorageRemediations).where(and(eq(evidenceStorageRemediations.organisationId, input.organisationId), eq(evidenceStorageRemediations.branchId, input.branchId))).orderBy(desc(evidenceStorageRemediations.createdAt));
      return input.evidenceFileId ? rows.filter(row => row.evidenceFileId === input.evidenceFileId) : rows;
    }),
    recordStorageRemediation: protectedProcedure.input(scopeInput.extend({ evidenceFileId: z.string().uuid(), status: z.enum(["identified", "provider_requested", "provider_confirmed"]), providerReference: z.string().max(255).optional(), note: z.string().min(4).max(4000) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageEvidenceGovernance });
      const [file] = await db.select().from(evidenceFiles).where(and(eq(evidenceFiles.id, input.evidenceFileId), eq(evidenceFiles.organisationId, input.organisationId), eq(evidenceFiles.branchId, input.branchId))).limit(1);
      if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "Evidence file is not in the selected branch." });
      if (input.status === "provider_confirmed" && !input.providerReference?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "A provider confirmation reference is required before recording provider-confirmed remediation." });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release2.evidence.storage_remediation", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(evidenceStorageRemediations).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, evidenceFileId: input.evidenceFileId, status: input.status, providerReference: input.providerReference?.trim(), note: input.note, correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release2.evidence_storage_remediation_recorded", entityType: "evidence_storage_remediation", entityId, correlationId, metadata: { evidenceFileId: input.evidenceFileId, status: input.status, providerReference: input.providerReference?.trim() ?? null } });
        });
        return { entityId, correlationId };
      }});
    }),
    recordRetentionReview: protectedProcedure.input(scopeInput.extend({ evidenceFileId: z.string().uuid(), reviewStatus: z.enum(["retained", "review_due", "legal_hold"]), retentionUntil: z.coerce.date().optional(), note: z.string().min(4).max(4000) }).merge(idempotencyInput)).mutation(async ({ ctx, input }) => {
      const db = await scopedDb({ ...input, userId: ctx.user.id, allowed: permissions.manageEvidenceGovernance });
      const [file] = await db.select().from(evidenceFiles).where(and(eq(evidenceFiles.id, input.evidenceFileId), eq(evidenceFiles.organisationId, input.organisationId), eq(evidenceFiles.branchId, input.branchId))).limit(1);
      if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "Evidence file is not in the selected branch." });
      return idempotent({ organisationId: input.organisationId, userId: ctx.user.id, action: "release2.evidence.retention_review", idempotencyKey: input.idempotencyKey, request: input, execute: async () => {
        const entityId = recordId(); const correlationId = correlation();
        await db.transaction(async transaction => {
          await transaction.insert(evidenceRetentionReviews).values({ id: entityId, organisationId: input.organisationId, branchId: input.branchId, evidenceFileId: input.evidenceFileId, reviewStatus: input.reviewStatus, retentionUntil: input.retentionUntil, note: input.note, correlationId, createdByUserId: ctx.user.id });
          await writeAudit(transaction, { organisationId: input.organisationId, branchId: input.branchId, actorUserId: ctx.user.id, action: "release2.evidence_retention_review_recorded", entityType: "evidence_retention_review", entityId, correlationId, metadata: { evidenceFileId: input.evidenceFileId, reviewStatus: input.reviewStatus, retentionUntil: input.retentionUntil?.toISOString() ?? null } });
        });
        return { entityId, correlationId };
      }});
    }),
  }),
});
