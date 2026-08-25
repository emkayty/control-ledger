import { describe, expect, it } from "vitest";
import { evidenceProposalDefaults } from "./evidenceProposal";

describe("evidence proposal defaults", () => {
  it("prefills only the human-editable evidence draft fields from a reviewed OPay proposal", () => {
    expect(evidenceProposalDefaults({ provider: "OPay", amountMinor: "3000000", currency: "NGN", sourceReference: "260819060100009169870983", occurredAtIso: "2026-08-19T22:34:05", confidence: "high", notes: "Confirm" })).toEqual({
      kind: "payment_observation",
      amountMinor: "3000000",
      currency: "NGN",
      sourceName: "OPay",
      sourceReference: "260819060100009169870983",
      occurredAt: "2026-08-19T22:34",
    });
  });

  it("leaves a manual evidence form empty rather than inventing an extracted value", () => {
    expect(evidenceProposalDefaults(null)).toEqual({ kind: "payment_observation", amountMinor: "", currency: "NGN", sourceName: "", sourceReference: "", occurredAt: "" });
  });
});
