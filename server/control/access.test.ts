import { describe, expect, it, vi, beforeEach } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("../db", () => ({ getDb: getDbMock }));

import { canPerform, requireScopedMembership } from "./access";

function databaseReturning(rows: unknown[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  };
}

describe("tenant-scoped protected access", () => {
  beforeEach(() => getDbMock.mockReset());

  it("permits an active branch-scoped operator to record evidence", async () => {
    getDbMock.mockResolvedValue(databaseReturning([{ id: "member-1", organisationId: "org-a", userId: 7, branchId: "branch-a", role: "operator", isActive: 1 }]));
    await expect(requireScopedMembership({ userId: 7, organisationId: "org-a", branchId: "branch-a", allowed: ["operator"] })).resolves.toMatchObject({ role: "operator" });
  });

  it("rejects a role that is not authorised for the requested action", async () => {
    getDbMock.mockResolvedValue(databaseReturning([{ id: "member-2", organisationId: "org-a", userId: 8, branchId: "branch-a", role: "operator", isActive: 1 }]));
    await expect(requireScopedMembership({ userId: 8, organisationId: "org-a", branchId: "branch-a", allowed: ["approver"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("fails closed when no active in-scope membership is returned", async () => {
    getDbMock.mockResolvedValue(databaseReturning([]));
    await expect(requireScopedMembership({ userId: 9, organisationId: "org-a", branchId: "branch-a", allowed: ["owner"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reserves receipt-extraction policy management for an organisation owner", () => {
    expect(canPerform("owner", "manageReceiptExtraction")).toBe(true);
    expect(canPerform("controller", "manageReceiptExtraction")).toBe(false);
    expect(canPerform("operator", "manageReceiptExtraction")).toBe(false);
  });
});
