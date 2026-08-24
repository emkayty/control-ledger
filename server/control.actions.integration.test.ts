import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));

import { appRouter } from "./routers";

type Recorded = Record<string, unknown>;

function authContext(): TrpcContext {
  return {
    user: { id: 1, openId: "control-owner", email: "owner@example.com", name: "Control Owner", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

function queuedDatabase(selections: unknown[][]) {
  const inserted: Recorded[] = [];
  const updates: Recorded[] = [];
  const values = async (payload: Recorded) => {
    inserted.push(payload);
    return { affectedRows: 1 };
  };
  const database = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => selections.shift() ?? [] }) }) }),
    insert: () => ({ values }),
    update: () => ({ set: (payload: Recorded) => ({ where: async () => { updates.push(payload); return { affectedRows: 1 }; } }) }),
    delete: () => ({ where: async () => ({ affectedRows: 1 }) }),
    transaction: async (callback: (tx: { insert: () => { values: typeof values } }) => Promise<unknown>) => callback({ insert: () => ({ values }) }),
  };
  return { database, inserted, updates };
}

const organisationId = "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0";
const branchId = "f894a6a4-b488-48f1-9e45-dba4f4f9d9c3";
const obligationId = "c2101d7a-3e96-4c36-b75e-b22c2be1371b";
const evidenceId = "5d58f6f1-a811-4f08-8d6a-7c31cb80184d";
const membership = [{ id: "member", organisationId, userId: 1, branchId, role: "controller", isActive: 1 }];
const branch = [{ id: branchId, organisationId, isActive: 1 }];

describe("material control action procedures", () => {
  beforeEach(() => getDbMock.mockReset());

  it("records an exact reconciliation through a protected procedure and creates an idempotency record", async () => {
    const { database, inserted } = queuedDatabase([
      membership,
      branch,
      [{ id: obligationId, organisationId, branchId, amountMinor: "500000", currency: "NGN", dueAt: new Date(Date.now() + 86_400_000) }],
      [{ id: evidenceId, organisationId, branchId, amountMinor: "500000", currency: "NGN", occurredAt: new Date() }],
      [],
      [],
    ]);
    getDbMock.mockResolvedValue(database);

    const result = await appRouter.createCaller(authContext()).control.reconciliation.run({ organisationId, branchId, obligationId, evidenceEventId: evidenceId, treatAsShort: false, idempotencyKey: "reconciliation-request-1" });

    expect(result.replayed).toBe(false);
    expect(inserted.some(row => row.action === "reconciliation.run" && typeof row.requestHash === "string")).toBe(true);
    expect(inserted.some(row => row.matchType === "exact" && row.ruleVersion === "release-1.0")).toBe(true);
  });

  it("creates a linked receivable correction instead of altering the original obligation", async () => {
    const { database, inserted } = queuedDatabase([
      membership,
      branch,
      [{ id: obligationId, organisationId, branchId, customerId: "9b52d5e3-74c4-45a6-a2ec-207ab249ff0e", reference: "INV-100", currency: "NGN", dueAt: new Date() }],
      [],
    ]);
    getDbMock.mockResolvedValue(database);

    const result = await appRouter.createCaller(authContext()).control.obligations.correct({ organisationId, branchId, originalObligationId: obligationId, amountMinor: "-50000", reason: "Approved pricing correction", idempotencyKey: "obligation-correction-1" });

    expect(result.replayed).toBe(false);
    expect(inserted.some(row => row.correctsObligationId === obligationId && row.sourceType === "correction")).toBe(true);
  });

  it("applies approval only from an eligible, non-initiating actor", async () => {
    const { database, updates } = queuedDatabase([
      [{ id: "exception-1", organisationId, branchId, status: "pending_approval", createdByUserId: 9 }],
      [{ id: "approver", organisationId, userId: 1, branchId, role: "approver", isActive: 1 }],
    ]);
    getDbMock.mockResolvedValue(database);

    const result = await appRouter.createCaller(authContext()).control.exceptions.approveResolution({ organisationId, exceptionId: "f46d6411-e7e7-4fc1-94a7-72a1475e0211", approve: true });

    expect(result.status).toBe("resolved");
    expect(updates[0]).toMatchObject({ status: "resolved", resolvedByUserId: 1 });
  });
});
