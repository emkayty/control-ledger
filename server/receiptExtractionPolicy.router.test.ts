import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));

import { appRouter } from "./routers";

const organisationId = "7d41438c-b234-4bc1-a0ec-44a846eaff2f";

function context(): TrpcContext {
  return { user: { id: 1, openId: "owner", email: "owner@example.com", name: "Owner", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function database(selections: unknown[][]) {
  const updates: Record<string, unknown>[] = [];
  const inserts: Record<string, unknown>[] = [];
  const query = (rows: unknown[]) => Object.assign(Promise.resolve(rows), { limit: async () => rows });
  const db = {
    select: () => ({ from: () => ({ where: () => query(selections.shift() ?? []) }) }),
    update: () => ({ set: (payload: Record<string, unknown>) => ({ where: async () => { updates.push(payload); return { affectedRows: 1 }; } }) }),
    insert: () => ({ values: async (payload: Record<string, unknown>) => { inserts.push(payload); return { affectedRows: 1 }; } }),
    transaction: async (callback: (tx: { update: typeof db.update; insert: typeof db.insert }) => Promise<unknown>) => callback({ update: db.update, insert: db.insert }),
  };
  return { db, updates, inserts };
}

describe("receipt extraction policy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the fail-closed policy state to an authorised member", async () => {
    const { db } = database([
      [{ id: "member", organisationId, userId: 1, branchId: null, role: "operator", isActive: 1 }],
      [{ enabled: 0, acceptedAt: null, acceptedByUserId: null }],
    ]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).control.receiptExtractionPolicy.get({ organisationId })).resolves.toEqual({ enabled: false, acceptedAt: null, acceptedBy: null });
  });

  it("rejects non-owner policy changes", async () => {
    const { db, updates, inserts } = database([
      [{ id: "member", organisationId, userId: 1, branchId: null, role: "controller", isActive: 1 }],
    ]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).control.receiptExtractionPolicy.configure({ organisationId, enabled: true, acceptProcessingNotice: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updates).toHaveLength(0);
    expect(inserts).toHaveLength(0);
  });

  it("requires notice acceptance and records an owner-approved enable decision with an audit event", async () => {
    const rejection = database([]);
    getDbMock.mockResolvedValue(rejection.db);
    await expect(appRouter.createCaller(context()).control.receiptExtractionPolicy.configure({ organisationId, enabled: true, acceptProcessingNotice: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const { db, updates, inserts } = database([
      [{ id: "member", organisationId, userId: 1, branchId: null, role: "owner", isActive: 1 }],
    ]);
    getDbMock.mockResolvedValue(db);
    await expect(appRouter.createCaller(context()).control.receiptExtractionPolicy.configure({ organisationId, enabled: true, acceptProcessingNotice: true })).resolves.toMatchObject({ enabled: true });
    expect(updates[0]).toMatchObject({ receiptExtractionEnabled: 1, receiptExtractionPolicyAcceptedByUserId: 1 });
    expect(inserts[0]).toMatchObject({ action: "organisation.receipt_extraction_policy_configured", metadata: { enabled: true, processingNoticeAccepted: true } });
  });

  it("lets an owner disable extraction and clears the active acceptance state with an audit event", async () => {
    const { db, updates, inserts } = database([
      [{ id: "member", organisationId, userId: 1, branchId: null, role: "owner", isActive: 1 }],
    ]);
    getDbMock.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).control.receiptExtractionPolicy.configure({ organisationId, enabled: false, acceptProcessingNotice: false })).resolves.toMatchObject({ enabled: false });
    expect(updates[0]).toMatchObject({ receiptExtractionEnabled: 0, receiptExtractionPolicyAcceptedAt: null, receiptExtractionPolicyAcceptedByUserId: null });
    expect(inserts[0]).toMatchObject({ action: "organisation.receipt_extraction_policy_configured", metadata: { enabled: false, processingNoticeAccepted: false } });
  });
});
