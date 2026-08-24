import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { canPerform } from "./access";
import { assertMinorAmount, isMinorAmount } from "./money";
import { calculateAvailableAllocation, determineReconciliation } from "./reconciliation";

describe("exact money controls", () => {
  it("accepts integer minor units and rejects floating point input", () => {
    expect(assertMinorAmount("125000")).toBe("125000");
    expect(() => assertMinorAmount("1250.00")).toThrow("exact integer minor-unit");
    expect(() => assertMinorAmount("1,25000")).toThrow("exact integer minor-unit");
    expect(isMinorAmount("750000")).toBe(true);
    expect(isMinorAmount("7500.00")).toBe(false);
  });
});

describe("deterministic reconciliation", () => {
  it("allocates only the remaining exact balance for split payments and one payment across multiple obligations", () => {
    expect(calculateAvailableAllocation({ obligationMinor: "500000", observedMinor: "200000", alreadyAllocatedToObligation: "0", alreadyAllocatedFromEvidence: "0" })).toEqual({ obligationRemainingMinor: "500000", evidenceRemainingMinor: "200000", allocatableMinor: "200000" });
    expect(calculateAvailableAllocation({ obligationMinor: "500000", observedMinor: "300000", alreadyAllocatedToObligation: "200000", alreadyAllocatedFromEvidence: "0" })).toEqual({ obligationRemainingMinor: "300000", evidenceRemainingMinor: "300000", allocatableMinor: "300000" });
    expect(calculateAvailableAllocation({ obligationMinor: "500000", observedMinor: "1000000", alreadyAllocatedToObligation: "0", alreadyAllocatedFromEvidence: "500000" })).toEqual({ obligationRemainingMinor: "500000", evidenceRemainingMinor: "500000", allocatableMinor: "500000" });
  });

  it("classifies an exact on-time match as matched", () => {
    expect(determineReconciliation({ obligationMinor: "500000", observedMinor: "500000", hasExistingLink: false, delayed: false })).toMatchObject({
      matchType: "exact", status: "matched", allocatedMinor: "500000", unresolvedMinor: "0",
    });
  });

  it("creates an unresolved short-payment outcome without rounding", () => {
    expect(determineReconciliation({ obligationMinor: "500000", observedMinor: "375000", hasExistingLink: false, delayed: false, shortPayment: true })).toMatchObject({
      matchType: "short", status: "unresolved", allocatedMinor: "375000", unresolvedMinor: "125000", exceptionType: "short_payment",
    });
  });

  it("keeps a valid part-payment separate from an asserted short payment", () => {
    expect(determineReconciliation({ obligationMinor: "500000", observedMinor: "250000", hasExistingLink: false, delayed: false })).toMatchObject({
      matchType: "partial", status: "unresolved", allocatedMinor: "250000", unresolvedMinor: "250000", exceptionType: "partial_payment",
    });
  });

  it("quarantines a duplicate link from financial allocation", () => {
    expect(determineReconciliation({ obligationMinor: "500000", observedMinor: "500000", hasExistingLink: true, delayed: false })).toMatchObject({
      matchType: "duplicate", status: "unresolved", allocatedMinor: "0", exceptionType: "duplicate_input",
    });
  });
});

describe("role-aware workflow permissions", () => {
  it("keeps approval separate from operator work", () => {
    expect(canPerform("operator", "recordEvidence")).toBe(true);
    expect(canPerform("operator", "approve")).toBe(false);
    expect(canPerform("approver", "approve")).toBe(true);
  });
});

describe("append-only financial workflow guardrails", () => {
  it("uses linked correction records rather than mutable receivable or evidence updates", () => {
    const routerSource = readFileSync(new URL("../routers/control.ts", import.meta.url), "utf8");
    expect(routerSource).toContain("correctsObligationId: original.id");
    expect(routerSource).toContain("correctsEventId: original.id");
    expect(routerSource).not.toContain("update(receivableObligations)");
    expect(routerSource).not.toContain("update(evidenceEvents)");
  });

  it("requires correlation IDs for material financial and audit records", () => {
    const routerSource = readFileSync(new URL("../routers/control.ts", import.meta.url), "utf8");
    expect(routerSource).toContain("const correlationId = correlation()");
    expect(routerSource).toContain("await writeAudit");
  });

  it("keeps idempotency keys and approval separation in the material-action contract", () => {
    const routerSource = readFileSync(new URL("../routers/control.ts", import.meta.url), "utf8");
    const schemaSource = readFileSync(new URL("../../drizzle/schema.ts", import.meta.url), "utf8");
    expect(schemaSource).toContain("idempotency_scope_key_unique");
    expect(routerSource).toContain("This idempotency key was previously used for a different request.");
    expect(routerSource).toContain("The exception initiator cannot approve its own resolution.");
  });
});
