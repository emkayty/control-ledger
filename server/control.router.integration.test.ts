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
});
