import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));

import { appRouter } from "./routers";
import { release2Math } from "./routers/release2";

type Recorded = Record<string, unknown>;

const organisationId = "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0";
const branchId = "f894a6a4-b488-48f1-9e45-dba4f4f9d9c3";
const customerId = "9b52d5e3-74c4-45a6-a2ec-207ab249ff0e";
const productId = "ea35263e-172d-440e-8f73-2d8ad0eff556";
const orderId = "e2ed3bde-9321-463e-8229-2603f94812a4";

function authContext(): TrpcContext {
  return { user: { id: 1, openId: "control-owner", email: "owner@example.com", name: "Control Owner", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as TrpcContext["res"] };
}

function queuedDatabase(selections: unknown[][]) {
  const inserted: Recorded[] = [];
  const executableRows = (rows: unknown[]) => {
    const query = Promise.resolve(rows) as Promise<unknown[]> & { limit: () => Promise<unknown[]>; orderBy: () => Promise<unknown[]> };
    query.limit = async () => rows;
    query.orderBy = async () => rows;
    return query;
  };
  const values = async (payload: Recorded) => { inserted.push(payload); return { affectedRows: 1 }; };
  const database = {
    select: () => ({ from: () => ({ where: () => executableRows(selections.shift() ?? []) }) }),
    insert: () => ({ values }),
    update: () => ({ set: () => ({ where: async () => ({ affectedRows: 1 }) }) }),
    delete: () => ({ where: async () => ({ affectedRows: 1 }) }),
    transaction: async (callback: (transaction: { insert: () => { values: typeof values }; update: () => { set: () => { where: () => Promise<unknown> } } }) => Promise<unknown>) => callback({ insert: () => ({ values }), update: () => ({ set: () => ({ where: async () => ({ affectedRows: 1 }) }) }) }),
  };
  return { database, inserted };
}

describe("Release 2 economic controls", () => {
  beforeEach(() => getDbMock.mockReset());

  it("keeps quantities exact to three decimal places and rejects fractional minor-unit invoice totals", () => {
    expect(release2Math.quantityMilli("12.5").toString()).toBe("12500");
    expect(release2Math.milliQuantity(BigInt(-12500))).toBe("-12.5");
    expect(release2Math.lineValueMinor([{ quantity: "2.5", unitPriceMinor: "100" }]).toString()).toBe("250");
    expect(() => release2Math.lineValueMinor([{ quantity: "0.001", unitPriceMinor: "1" }])).toThrow(TRPCError);
  });

  it("records product creation with an idempotency record and an in-transaction audit event", async () => {
    const membership = [{ id: "member", organisationId, userId: 1, branchId, role: "manager", isActive: 1 }];
    const branch = [{ id: branchId, organisationId, isActive: 1 }];
    const { database, inserted } = queuedDatabase([membership, branch, []]);
    getDbMock.mockResolvedValue(database);

    const result = await appRouter.createCaller(authContext()).release2.products.create({ organisationId, branchId, sku: "sugar-50", name: "Sugar 50kg", unitOfMeasure: "bag", reorderPointQuantity: "3", idempotencyKey: "release2-product-request-1" });

    expect(result.replayed).toBe(false);
    expect(inserted.some(row => row.action === "release2.product.create" && typeof row.requestHash === "string")).toBe(true);
    expect(inserted.some(row => row.sku === "SUGAR-50" && row.name === "Sugar 50kg")).toBe(true);
    expect(inserted.some(row => row.action === "release2.product_created" && row.entityType === "product")).toBe(true);
  });

  it("denies product creation to an operator even when they have branch membership", async () => {
    const operatorMembership = [{ id: "operator-member", organisationId, userId: 1, branchId, role: "operator", isActive: 1 }];
    const { database, inserted } = queuedDatabase([operatorMembership]);
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(authContext()).release2.products.create({ organisationId, branchId, sku: "not-allowed", name: "Not allowed", unitOfMeasure: "unit", reorderPointQuantity: "0", idempotencyKey: "release2-product-operator-request" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(inserted).toHaveLength(0);
  });

  it("refuses delivery before stock exists, preserving the append-only stock history", async () => {
    const membership = [{ id: "member", organisationId, userId: 1, branchId, role: "manager", isActive: 1 }];
    const branch = [{ id: branchId, organisationId, isActive: 1 }];
    const order = [{ id: orderId, organisationId, branchId, customerId, status: "confirmed" }];
    const orderLines = [{ id: "line", orderId, productId, quantity: "4", unitPriceMinor: "100", currency: "NGN" }];
    const product = [{ id: productId, organisationId, branchId, isActive: 1 }];
    const { database, inserted } = queuedDatabase([membership, branch, order, orderLines, product, []]);
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(authContext()).release2.deliveries.create({ organisationId, branchId, orderId, deliveryNumber: "DEL-1", deliveredAt: new Date(), lines: [{ productId, quantity: "4" }], idempotencyKey: "release2-delivery-request-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(inserted).toHaveLength(0);
  });

  it("issues a new invoice-linked receivable from a delivered order without changing an existing obligation", async () => {
    const membership = [{ id: "member", organisationId, userId: 1, branchId, role: "manager", isActive: 1 }];
    const branch = [{ id: branchId, organisationId, isActive: 1 }];
    const deliveredOrder = [{ id: orderId, organisationId, branchId, customerId, orderNumber: "SO-500", status: "delivered" }];
    const orderLines = [{ quantity: "2", unitPriceMinor: "50000", currency: "NGN" }];
    const { database, inserted } = queuedDatabase([membership, branch, deliveredOrder, orderLines, []]);
    getDbMock.mockResolvedValue(database);

    const result = await appRouter.createCaller(authContext()).release2.invoices.issue({ organisationId, branchId, orderId, invoiceNumber: "INV-R2-500", idempotencyKey: "release2-invoice-request-1" });

    const obligation = inserted.find(row => row.sourceType === "release2_invoice");
    const invoice = inserted.find(row => row.invoiceNumber === "INV-R2-500");
    expect(result.replayed).toBe(false);
    expect(obligation).toMatchObject({ reference: "INV-R2-500", amountMinor: "100000", sourceReference: "SO-500", customerId });
    expect(invoice).toMatchObject({ amountMinor: "100000", obligationId: obligation?.id });
    expect(inserted.some(row => row.id === "c2101d7a-3e96-4c36-b75e-b22c2be1371b" && row.sourceType === "release2_invoice")).toBe(false);
  });
});
