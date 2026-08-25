import type { OPayProposal } from "@/components/ReceiptProposalCard";

export function toDateTimeLocal(value: string | null) {
  return value ? (value.includes("Z") ? new Date(value).toISOString().slice(0, 16) : value.slice(0, 16)) : "";
}

export function evidenceProposalDefaults(proposal: OPayProposal | null) {
  return {
    kind: "payment_observation" as const,
    amountMinor: proposal?.amountMinor ?? "",
    currency: proposal?.currency ?? "NGN",
    sourceName: proposal ? "OPay" : "",
    sourceReference: proposal?.sourceReference ?? "",
    occurredAt: toDateTimeLocal(proposal?.occurredAtIso ?? null),
  };
}
