export type EvidenceAssociationCorrection = {
  id: string;
  evidenceEventId: string;
  obligationId: string;
  createdAt: Date;
};

/** The newest append-only correction determines the effective evidence-to-receivable association. */
export function latestEvidenceAssociation(
  corrections: EvidenceAssociationCorrection[],
  evidenceEventId: string,
) {
  return corrections
    .filter(correction => correction.evidenceEventId === evidenceEventId)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
}
