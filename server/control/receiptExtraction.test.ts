import { describe, expect, it } from "vitest";
import { normaliseReceiptProposal, parseReceiptProposalResponse, receiptProposalSchema } from "./receiptExtraction";

describe("receipt proposal safeguards", () => {
  it("normalises an OPay proposal without treating it as a financial record", () => {
    const proposal = normaliseReceiptProposal(receiptProposalSchema.parse({
      provider: "OPay",
      sourceReference: "  260819060100009169870983  ",
      amountMinor: "3000000",
      currency: "ngn",
      occurredAtIso: "2026-08-19T21:34:05.000Z",
      confidence: "high",
      notes: " Visible transaction reference. ",
    }));

    expect(proposal).toMatchObject({ sourceReference: "260819060100009169870983", amountMinor: "3000000", currency: "NGN", confidence: "high" });
  });

  it("rejects decimal proposal amounts so evidence intake retains exact minor-unit rules", () => {
    expect(() => receiptProposalSchema.parse({ provider: "OPay", sourceReference: "ref", amountMinor: "30000.00", currency: "NGN", occurredAtIso: null, confidence: "medium", notes: "Needs review" })).toThrow();
  });

  it("retains a visible local receipt timestamp for user confirmation without assigning a time zone", () => {
    expect(receiptProposalSchema.parse({ provider: "OPay", sourceReference: "ref", amountMinor: "3000000", currency: "NGN", occurredAtIso: "2026-08-19T22:34:05", confidence: "high", notes: "Visible on receipt" }).occurredAtIso).toBe("2026-08-19T22:34:05");
  });

  it("fails closed when a vision response is not a textual structured proposal", () => {
    expect(() => parseReceiptProposalResponse({ amountMinor: "3000000" })).toThrow("textual structured proposal");
  });
});
