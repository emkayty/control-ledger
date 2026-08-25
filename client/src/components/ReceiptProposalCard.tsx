import React from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/control";

export type OPayProposal = {
  provider: "OPay";
  sourceReference: string | null;
  amountMinor: string | null;
  currency: string | null;
  occurredAtIso: string | null;
  confidence: "low" | "medium" | "high";
  notes: string;
};

export function ReceiptPreviewButton({ onPreview }: { onPreview: () => void }) {
  return <Button type="button" size="sm" variant="outline" onClick={onPreview} className="h-8 rounded-lg text-xs"><Eye className="mr-1.5 size-3.5" />Preview</Button>;
}

export function ReceiptProposalCard({ proposal, onReview }: { proposal: OPayProposal; onReview: () => void }) {
  return <div className="w-full rounded-xl border border-violet-100 bg-violet-50/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold text-violet-900">OPay proposal · {proposal.confidence} confidence</p><Button type="button" size="sm" onClick={onReview} className="h-8 rounded-lg bg-violet-700 text-xs hover:bg-violet-800">Review in evidence form</Button></div><p className="mt-2 text-xs text-violet-950">{proposal.amountMinor && proposal.currency ? `${formatMoney(proposal.amountMinor, proposal.currency)} · ` : ""}{proposal.sourceReference ?? "No reference read"}</p><p className="mt-1 text-[11px] leading-4 text-violet-800">{proposal.notes} Confirm every field before recording; extraction is not proof of settlement.</p></div>;
}
