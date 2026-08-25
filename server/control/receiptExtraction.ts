import { z } from "zod";

export const receiptProposalSchema = z.object({
  provider: z.literal("OPay"),
  sourceReference: z.string().max(160).nullable(),
  amountMinor: z.string().regex(/^\d+$/).nullable(),
  currency: z.string().length(3).nullable(),
  occurredAtIso: z.string().min(16).max(64).nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  notes: z.string().max(500),
});

export type ReceiptProposal = z.infer<typeof receiptProposalSchema>;

export function normaliseReceiptProposal(input: ReceiptProposal): ReceiptProposal {
  return {
    ...input,
    currency: input.currency?.toUpperCase() ?? null,
    sourceReference: input.sourceReference?.trim() || null,
    notes: input.notes.trim(),
  };
}

export function parseReceiptProposalResponse(content: unknown): ReceiptProposal {
  if (typeof content !== "string") throw new Error("Receipt extraction did not return a textual structured proposal.");
  return normaliseReceiptProposal(receiptProposalSchema.parse(JSON.parse(content)));
}
