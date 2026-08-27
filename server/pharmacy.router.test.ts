import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { pharmacySafety } from "./routers/pharmacy";

describe("pharmacy dispensing safety boundary", () => {
  const now = new Date("2026-08-27T10:00:00.000Z");

  it("rejects absent, quarantined, expired, and insufficient Pharmacy batch candidates", () => {
    expect(pharmacySafety.evaluatePharmacyBatch(null, "1", now)).toMatchObject({ eligible: false, reason: expect.stringMatching(/not managed/i) });
    expect(pharmacySafety.evaluatePharmacyBatch({ status: "quarantined", expiryAt: new Date("2026-09-01T10:00:00.000Z"), availableQuantity: "10" }, "1", now)).toMatchObject({ eligible: false, reason: expect.stringMatching(/not active/i) });
    expect(pharmacySafety.evaluatePharmacyBatch({ status: "active", expiryAt: new Date("2026-08-27T09:59:59.000Z"), availableQuantity: "10" }, "1", now)).toMatchObject({ eligible: false, reason: expect.stringMatching(/expired/i) });
    expect(pharmacySafety.evaluatePharmacyBatch({ status: "active", expiryAt: new Date("2026-09-01T10:00:00.000Z"), availableQuantity: "0.5" }, "1", now)).toMatchObject({ eligible: false, reason: expect.stringMatching(/enough/i) });
  });

  it("accepts only a Pharmacy-managed active, in-date batch with exact available quantity", () => {
    const result = pharmacySafety.evaluatePharmacyBatch({ status: "active", expiryAt: new Date("2026-09-01T10:00:00.000Z"), availableQuantity: "1.25" }, "1.25", now);

    expect(result).toEqual({ eligible: true, reason: "Batch is active, in date, and has sufficient Pharmacy-controlled availability." });
    expect(pharmacySafety.quantityMilli("1.25").toString()).toBe("1250");
    expect(pharmacySafety.milliQuantity(BigInt(-1250))).toBe("-1.25");
  });

  it("requires the exact owner activation acknowledgement before any policy handler runs", async () => {
    const context = { user: { id: 1, openId: "owner", email: "owner@example.com", name: "Owner", loginMethod: "manus", role: "user", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] } satisfies TrpcContext;

    await expect(appRouter.createCaller(context).pharmacy.policy.enable({ organisationId: "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0", branchId: "f894a6a4-b488-48f1-9e45-dba4f9d9c3", acknowledgement: "ENABLE DISPENSING", noticeVersion: pharmacySafety.POLICY_NOTICE_VERSION, idempotencyKey: "pharmacy-policy-phrase-test" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects non-reference characters before executing a Pharmacy request search", async () => {
    const context = { user: { id: 1, openId: "owner", email: "owner@example.com", name: "Owner", loginMethod: "manus", role: "user", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] } satisfies TrpcContext;

    await expect(appRouter.createCaller(context).pharmacy.dispensing.list({ organisationId: "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0", branchId: "f894a6a4-b488-48f1-9e45-dba4f9d9c3", search: "PATIENT NAME" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(appRouter.createCaller(context).pharmacy.dispensing.list({ organisationId: "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0", branchId: "f894a6a4-b488-48f1-9e45-dba4f9d9c3", search: "RX-93428" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(appRouter.createCaller(context).pharmacy.dispensing.list({ organisationId: "a041b5a2-2a3e-49cc-a9aa-2c7b8a6ea5d0", branchId: "f894a6a4-b488-48f1-9e45-dba4f9d9c3", search: "REQ-12%" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
