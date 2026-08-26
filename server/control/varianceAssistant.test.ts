import { describe, expect, it } from "vitest";
import { orderVarianceCandidates, parseVarianceAiProposalResponse } from "./varianceAssistant";

describe("variance AI proposal safeguards", () => {
  it("accepts bounded structured output and strips model references that are not in the server candidate set", () => {
    const proposal = parseVarianceAiProposalResponse(JSON.stringify({
      confidence: "medium",
      summary: "The value differs from the linked evidence.",
      potentialCauses: [{ label: "Amount mismatch", rationale: "The linked amounts differ.", confidence: "high" }],
      possibleMatches: [
        { candidateKey: "R1", rationale: "The value is close.", confidence: "medium" },
        { candidateKey: "E9", rationale: "This must not be displayed.", confidence: "high" },
      ],
      reviewSteps: ["Compare source references before taking any governed action."],
    }), ["R1"]);

    expect(proposal.possibleMatches).toEqual([{ candidateKey: "R1", rationale: "The value is close.", confidence: "medium" }]);
  });

  it("rejects malformed output and orders candidates with exact integer minor-unit arithmetic", () => {
    expect(() => parseVarianceAiProposalResponse("{}", ["R1"])).toThrow();
    const ordered = orderVarianceCandidates([
      { candidateKey: "E1", kind: "evidence" as const, reference: "OBS-1", status: "recorded", amountMinor: "9007199254740994", currency: "NGN", occurredAt: null },
      { candidateKey: "R1", kind: "receivable" as const, reference: "INV-1", status: "open", amountMinor: "9007199254740993", currency: "NGN", occurredAt: null },
    ], "9007199254740993");
    expect(ordered.map(candidate => candidate.candidateKey)).toEqual(["R1", "E1"]);
  });
});
