import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));

import { appRouter } from "./routers";

function authContext(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

function workspaceDatabase() {
  let calls = 0;
  const memberships = [{ organisationId: "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0", branchId: null, role: "owner", organisationName: "Aster Distribution" }];
  const branchRows = [{ id: "f894a6a4-b488-48f1-9e45-dba4f4f9d9c3", organisationId: memberships[0].organisationId, name: "Main Branch", code: "MAIN", isActive: 1, createdAt: new Date() }];
  return {
    select: () => {
      calls += 1;
      const rows = calls === 1 ? memberships : branchRows;
      return {
        from: () => ({
          innerJoin: () => ({ where: async () => rows }),
          where: async () => rows,
        }),
      };
    },
  };
}

function workspaceDatabaseFor(memberships: Array<{ organisationId: string; branchId: string | null; role: string; organisationName: string }>, branchRows: Array<{ id: string; organisationId: string; name: string; code: string; isActive: number; createdAt: Date }>) {
  let calls = 0;
  return {
    select: () => {
      calls += 1;
      const rows = calls === 1 ? memberships : branchRows;
      return {
        from: () => ({
          innerJoin: () => ({ where: async () => rows }),
          where: async () => rows,
        }),
      };
    },
  };
}

function auditDatabase() {
  let calls = 0;
  const organisationId = "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0";
  const branchId = "f894a6a4-b488-48f1-9e45-dba4f4f9d9c3";
  return {
    select: () => {
      calls += 1;
      if (calls === 1) return { from: () => ({ where: () => ({ limit: async () => [{ id: "member", organisationId, userId: 1, branchId, role: "operator", isActive: 1 }] }) }) };
      if (calls === 2) return { from: () => ({ where: () => ({ limit: async () => [{ id: branchId, organisationId, isActive: 1 }] }) }) };
      return { from: () => ({ innerJoin: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [{ id: "audit-1", action: "obligation.recorded", entityType: "receivable_obligation", entityId: "obligation-1", branchId, correlationId: "corr-1", metadata: { reference: "INV-100" }, occurredAt: new Date("2026-08-24T12:00:00.000Z"), actorName: "Scope Test", actorEmail: "scope@example.com" }] }) }) }) }) };
    },
  };
}

describe("control workspace protected procedure integration", () => {
  beforeEach(() => getDbMock.mockReset());

  it("rejects an unauthenticated request before reading a workspace", async () => {
    const caller = appRouter.createCaller(authContext(null));
    await expect(caller.control.workspace.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("returns only the authenticated user’s scoped workspace response", async () => {
    getDbMock.mockResolvedValue(workspaceDatabase());
    const caller = appRouter.createCaller(authContext({
      id: 1,
      openId: "scope-test-user",
      email: "scope@example.com",
      name: "Scope Test",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }));

    const result = await caller.control.workspace.list();

    expect(result.memberships).toEqual([{ organisationId: "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0", branchId: null, role: "owner", organisationName: "Aster Distribution" }]);
    expect(result.branches).toHaveLength(1);
    expect(result.branches[0]?.organisationId).toBe(result.memberships[0]?.organisationId);
  });

  it("returns all active branches for an organisation-wide membership but only the assigned branch for a branch-scoped membership", async () => {
    const organisationId = "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0";
    const mainBranch = { id: "f894a6a4-b488-48f1-9e45-dba4f4f9d9c3", organisationId, name: "Main", code: "MAIN", isActive: 1, createdAt: new Date() };
    const lagosBranch = { id: "a9ea64b9-932f-4eb8-a20c-d7b4521b7959", organisationId, name: "Lagos", code: "LAG", isActive: 1, createdAt: new Date() };
    const user = { id: 1, openId: "scope-test-user", email: "scope@example.com", name: "Scope Test", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

    getDbMock.mockResolvedValueOnce(workspaceDatabaseFor([{ organisationId, branchId: mainBranch.id, role: "operator", organisationName: "Aster Distribution" }], [mainBranch, lagosBranch]));
    const branchScoped = await appRouter.createCaller(authContext(user)).control.workspace.list();
    expect(branchScoped.branches.map(branch => branch.id)).toEqual([mainBranch.id]);

    getDbMock.mockResolvedValueOnce(workspaceDatabaseFor([{ organisationId, branchId: null, role: "owner", organisationName: "Aster Distribution" }], [mainBranch, lagosBranch]));
    const organisationWide = await appRouter.createCaller(authContext(user)).control.workspace.list();
    expect(organisationWide.branches.map(branch => branch.id)).toEqual([mainBranch.id, lagosBranch.id]);
  });

  it("returns scoped audit history with the immutable action and correlation fields", async () => {
    getDbMock.mockResolvedValue(auditDatabase());
    const result = await appRouter.createCaller(authContext({ id: 1, openId: "scope-test-user", email: "scope@example.com", name: "Scope Test", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() })).control.audit.list({ organisationId: "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0", branchId: "f894a6a4-b488-48f1-9e45-dba4f4f9d9c3", limit: 50 });
    expect(result).toEqual([expect.objectContaining({ action: "obligation.recorded", correlationId: "corr-1", actorName: "Scope Test" })]);
  });

  it("rejects unauthenticated audit-history access before database retrieval", async () => {
    const caller = appRouter.createCaller(authContext(null));
    await expect(caller.control.audit.list({ organisationId: "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0", branchId: "f894a6a4-b488-48f1-9e45-dba4f4f9d9c3", limit: 50 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("fails closed when an authenticated user lacks an active membership for the audit scope", async () => {
    getDbMock.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }) });
    const caller = appRouter.createCaller(authContext({ id: 7, openId: "unauthorised-user", email: "unauthorised@example.com", name: "Unauthorised", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }));
    await expect(caller.control.audit.list({ organisationId: "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0", branchId: "f894a6a4-b488-48f1-9e45-dba4f4f9d9c3", limit: 50 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
