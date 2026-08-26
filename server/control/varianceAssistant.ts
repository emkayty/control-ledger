import { z } from "zod";

export const varianceAiConfidenceSchema = z.enum(["low", "medium", "high"]);

export const varianceAiProposalSchema = z.object({
  confidence: varianceAiConfidenceSchema,
  summary: z.string().min(1).max(480),
  potentialCauses: z.array(z.object({
    label: z.string().min(1).max(100),
    rationale: z.string().min(1).max(280),
    confidence: varianceAiConfidenceSchema,
  }).strict()).max(3),
  possibleMatches: z.array(z.object({
    candidateKey: z.string().regex(/^[RE][1-9][0-9]?$/),
    rationale: z.string().min(1).max(280),
    confidence: varianceAiConfidenceSchema,
  }).strict()).max(4),
  reviewSteps: z.array(z.string().min(1).max(220)).max(3),
}).strict();

export type VarianceAiProposal = z.infer<typeof varianceAiProposalSchema>;

export function parseVarianceAiProposalResponse(content: unknown, candidateKeys: readonly string[]) {
  if (typeof content !== "string") throw new Error("The model did not return textual structured output.");
  const proposal = varianceAiProposalSchema.parse(JSON.parse(content));
  const permitted = new Set(candidateKeys);
  return {
    ...proposal,
    possibleMatches: proposal.possibleMatches.filter(match => permitted.has(match.candidateKey)),
  };
}

export type VarianceCandidate = {
  candidateKey: string;
  kind: "receivable" | "evidence";
  reference: string;
  status: string;
  amountMinor: string;
  currency: string;
  occurredAt: string | null;
  sourceName?: string;
};

export function orderVarianceCandidates<T extends VarianceCandidate>(candidates: T[], targetMinor: string) {
  const target = BigInt(targetMinor);
  const difference = (amountMinor: string) => {
    const value = BigInt(amountMinor);
    return value >= target ? value - target : target - value;
  };
  return [...candidates].sort((left, right) => {
    const delta = difference(left.amountMinor) - difference(right.amountMinor);
    return delta === BigInt(0) ? left.candidateKey.localeCompare(right.candidateKey) : delta < BigInt(0) ? -1 : 1;
  });
}
