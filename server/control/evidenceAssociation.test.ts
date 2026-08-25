import { describe, expect, it } from "vitest";
import { latestEvidenceAssociation } from "./evidenceAssociation";

describe("append-only evidence association corrections", () => {
  it("uses the newest correction for an evidence event without replacing historical corrections", () => {
    const corrections = [
      { id: "first", evidenceEventId: "evidence-a", obligationId: "obligation-old", createdAt: new Date("2026-08-20T00:00:00Z") },
      { id: "other", evidenceEventId: "evidence-b", obligationId: "obligation-b", createdAt: new Date("2026-08-22T00:00:00Z") },
      { id: "latest", evidenceEventId: "evidence-a", obligationId: "obligation-current", createdAt: new Date("2026-08-21T00:00:00Z") },
    ];

    expect(latestEvidenceAssociation(corrections, "evidence-a")).toMatchObject({ id: "latest", obligationId: "obligation-current" });
    expect(latestEvidenceAssociation(corrections, "unknown")).toBeUndefined();
  });
});
