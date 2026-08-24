import { compareMinor, minimumMinor, remainingMinor, subtractMinor } from "./money";

export type ReconciliationOutcome = {
  matchType: "exact" | "partial" | "short" | "duplicate" | "delayed" | "manual_review";
  status: "matched" | "unresolved";
  allocatedMinor: string;
  unresolvedMinor: string;
  exceptionType?: "partial_payment" | "short_payment" | "duplicate_input" | "delayed_settlement" | "unmatched_record";
};

export function calculateAvailableAllocation(input: {
  obligationMinor: string;
  observedMinor: string;
  alreadyAllocatedToObligation: string;
  alreadyAllocatedFromEvidence: string;
}) {
  const obligationRemainingMinor = remainingMinor(input.obligationMinor, input.alreadyAllocatedToObligation);
  const evidenceRemainingMinor = remainingMinor(input.observedMinor, input.alreadyAllocatedFromEvidence);
  return {
    obligationRemainingMinor,
    evidenceRemainingMinor,
    allocatableMinor: minimumMinor(obligationRemainingMinor, evidenceRemainingMinor),
  };
}

export function determineReconciliation(input: {
  obligationMinor: string;
  observedMinor: string;
  hasExistingLink: boolean;
  delayed: boolean;
  shortPayment?: boolean;
}): ReconciliationOutcome {
  if (input.hasExistingLink) {
    return {
      matchType: "duplicate",
      status: "unresolved",
      allocatedMinor: "0",
      unresolvedMinor: input.observedMinor,
      exceptionType: "duplicate_input",
    };
  }

  const comparison = compareMinor(input.observedMinor, input.obligationMinor);
  if (comparison === 0 && !input.delayed) {
    return { matchType: "exact", status: "matched", allocatedMinor: input.observedMinor, unresolvedMinor: "0" };
  }
  if (comparison === 0 && input.delayed) {
    return {
      matchType: "delayed",
      status: "unresolved",
      allocatedMinor: input.observedMinor,
      unresolvedMinor: "0",
      exceptionType: "delayed_settlement",
    };
  }
  if (comparison < 0) {
    return {
      matchType: input.shortPayment ? "short" : "partial",
      status: "unresolved",
      allocatedMinor: input.observedMinor,
      unresolvedMinor: subtractMinor(input.obligationMinor, input.observedMinor),
      exceptionType: input.shortPayment ? "short_payment" : "partial_payment",
    };
  }
  return {
    matchType: "manual_review",
    status: "unresolved",
    allocatedMinor: input.obligationMinor,
    unresolvedMinor: subtractMinor(input.observedMinor, input.obligationMinor),
    exceptionType: "unmatched_record",
  };
}
