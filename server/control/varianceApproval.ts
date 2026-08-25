export type ApprovalDecision = "submitted" | "approved" | "returned";

export function nextExceptionStatus(decision: ApprovalDecision) {
  if (decision === "submitted") return "pending_approval" as const;
  if (decision === "approved") return "resolved" as const;
  return "investigating" as const;
}
