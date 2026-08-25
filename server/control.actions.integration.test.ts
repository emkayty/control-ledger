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
  const executableRows = (rows: unknown[]) => {
    const query = Promise.resolve(rows) as Promise<unknown[]> & { limit: () => Promise<unknown[]> };
    query.limit = async () => rows;
    return query;
  };
  const values = async (payload: Recorded) => {
    inserted.push(payload);
    return { affectedRows: 1 };
  };
  const database = {
    select: () => ({ from: () => ({ where: () => executableRows(selections.shift() ?? []) }) }),
    insert: () => ({ values }),
    update: () => ({ set: (payload: Recorded) => ({ where: async () => { updates.push(payload); return { affectedRows: 1 }; } }) }),
    delete: () => ({ where: async () => ({ affectedRows: 1 }) }),
    transaction: async (callback: (tx: { insert: () => { values: typeof values } }) => Promise<unknown>) => callback({ insert: () => ({ values }) }),
  };
  return { database, inserted, updates };
}

function branchCreateDatabase(duplicateCode = false) {
  const inserted: Recorded[] = [];
  const updates: Recorded[] = [];
  let idempotencyRecord: Recorded | null = null;
  let selectCount = 0;
  const ownerMembership = [{ id: "owner-member", organisationId, userId: 1, branchId: null, role: "owner", isActive: 1 }];
  const database = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => {
      selectCount += 1;
      if (selectCount === 1 || selectCount === 4) return ownerMembership;
      if (selectCount === 2 || selectCount === 5) return idempotencyRecord ? [idempotencyRecord] : [];
      if (selectCount === 3) return duplicateCode ? [{ id: "existing-branch" }] : [];
      return [];
    } }) }) }),
    insert: () => ({ values: async (payload: Recorded) => {
      inserted.push(payload);
      if (payload.action === "branch.create") idempotencyRecord = { ...payload };
      return { affectedRows: 1 };
    } }),
    update: () => ({ set: (payload: Recorded) => ({ where: async () => {
      updates.push(payload);
      if (idempotencyRecord && payload.responseMetadata) idempotencyRecord = { ...idempotencyRecord, responseMetadata: payload.responseMetadata };
      return { affectedRows: 1 };
    } }) }),
    delete: () => ({ where: async () => ({ affectedRows: 1 }) }),
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
      [],
    ]);
    getDbMock.mockResolvedValue(database);

    const result = await appRouter.createCaller(authContext()).control.reconciliation.run({ organisationId, branchId, obligationId, evidenceEventId: evidenceId, treatAsShort: false, idempotencyKey: "reconciliation-request-1" });

    expect(result.replayed).toBe(false);
    expect(inserted.some(row => row.action === "reconciliation.run" && typeof row.requestHash === "string")).toBe(true);
    expect(inserted.some(row => row.matchType === "exact" && row.ruleVersion === "release-1.1")).toBe(true);
  });

  it("uses the newest append-only association correction when reconciling evidence", async () => {
    const { database, inserted } = queuedDatabase([
      membership,
      branch,
      [{ id: obligationId, organisationId, branchId, amountMinor: "500000", currency: "NGN", dueAt: new Date(Date.now() + 86_400_000) }],
      [{ id: evidenceId, organisationId, branchId, obligationId: "stale-obligation", amountMinor: "500000", currency: "NGN", occurredAt: new Date() }],
      [{ id: "association-correction", evidenceEventId: evidenceId, obligationId, createdAt: new Date() }],
      [],
      [],
    ]);
    getDbMock.mockResolvedValue(database);

    const result = await appRouter.createCaller(authContext()).control.reconciliation.run({ organisationId, branchId, obligationId, evidenceEventId: evidenceId, treatAsShort: false, idempotencyKey: "corrected-association-match-1" });

    expect(result.replayed).toBe(false);
    expect(inserted.some(row => row.matchType === "exact" && row.evidenceEventId === evidenceId)).toBe(true);
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

  it("records an append-only evidence association correction for an in-scope receivable", async () => {
    const { database, inserted } = queuedDatabase([
      membership,
      branch,
      [{ id: evidenceId, customerId: "9b52d5e3-74c4-45a6-a2ec-207ab249ff0e" }],
      [{ id: obligationId, customerId: "9b52d5e3-74c4-45a6-a2ec-207ab249ff0e" }],
    ]);
    getDbMock.mockResolvedValue(database);

    const result = await appRouter.createCaller(authContext()).control.evidence.correctAssociation({
      organisationId,
      branchId,
      evidenceEventId: evidenceId,
      obligationId,
      reason: "Corrected source association from intake review",
      idempotencyKey: "evidence-association-correction-1",
    });

    expect(result.replayed).toBe(false);
    expect(inserted.some(row => row.evidenceEventId === evidenceId && row.obligationId === obligationId && row.reason === "Corrected source association from intake review")).toBe(true);
  });

  it("rejects a zero-value original receivable before it can enter the control ledger", async () => {
    await expect(appRouter.createCaller(authContext()).control.obligations.create({
      organisationId,
      branchId,
      customerId: "9b52d5e3-74c4-45a6-a2ec-207ab249ff0e",
      reference: "INV-ZERO",
      amountMinor: "0",
      currency: "NGN",
      idempotencyKey: "zero-obligation-1",
    })).rejects.toThrow("greater than zero");
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("quarantines a zero-value original evidence intake rather than creating evidence", async () => {
    const { database, inserted } = queuedDatabase([membership, branch, []]);
    getDbMock.mockResolvedValue(database);

    const result = await appRouter.createCaller(authContext()).control.evidence.intake({
      organisationId,
      branchId,
      kind: "payment_observation",
      amountMinor: "0",
      currency: "NGN",
      sourceName: "Bank feed",
      sourceReference: "BANK-ZERO-1",
      idempotencyKey: "zero-evidence-1",
    });

    expect(result.status).toBe("quarantined");
    expect(inserted.some(row => row.status === "quarantined" && row.quarantineReason === "Amount must be a positive exact minor-unit integer.")).toBe(true);
    expect(inserted.some(row => row.action === "evidence.recorded")).toBe(false);
  });

  it("rejects evidence associated with a receivable that is outside the active branch", async () => {
    const { database, inserted } = queuedDatabase([membership, branch, []]);
    getDbMock.mockResolvedValue(database);

    await expect(appRouter.createCaller(authContext()).control.evidence.intake({
      organisationId,
      branchId,
      obligationId,
      kind: "payment_observation",
      amountMinor: "500000",
      currency: "NGN",
      sourceName: "Bank feed",
      sourceReference: "OUT-OF-SCOPE-RECEIVABLE-1",
      idempotencyKey: "invalid-evidence-link-1",
    })).rejects.toThrow("selected receivable is not in the active branch");

    expect(inserted).toHaveLength(0);
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

  it("allows only an owner to create a branch", async () => {
    const { database } = queuedDatabase([[{ id: "controller", organisationId, userId: 1, branchId: null, role: "controller", isActive: 1 }]]);
    getDbMock.mockResolvedValue(database);
    await expect(appRouter.createCaller(authContext()).control.branches.create({ organisationId, name: "Lagos Branch", code: "LAG-01", idempotencyKey: "branch-owner-only-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("replays a same-key branch creation without a second branch insert", async () => {
    const { database, inserted } = branchCreateDatabase();
    getDbMock.mockResolvedValue(database);
    const caller = appRouter.createCaller(authContext());
    const input = { organisationId, name: "Lagos Branch", code: "lag-01", idempotencyKey: "branch-safe-replay-1" };
    const first = await caller.control.branches.create(input);
    const replay = await caller.control.branches.create(input);
    expect(first.replayed).toBe(false);
    expect(replay).toMatchObject({ replayed: true, entityId: first.entityId });
    expect(inserted.filter(row => row.name === "Lagos Branch")).toHaveLength(1);
  });

  it("rejects a different request when the branch code is already present", async () => {
    const { database, inserted } = branchCreateDatabase(true);
    getDbMock.mockResolvedValue(database);
    await expect(appRouter.createCaller(authContext()).control.branches.create({ organisationId, name: "Lagos Branch", code: "LAG-01", idempotencyKey: "branch-duplicate-code-1" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(inserted.filter(row => row.name === "Lagos Branch")).toHaveLength(0);
  });
});
