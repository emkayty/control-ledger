import { describe, expect, it } from "vitest";
import { assertEvidenceFileInput, assertEvidenceLinkScope } from "./fileSecurity";

describe("evidence file controls", () => {
  it("allows supported evidence metadata without storing file bytes in the database layer", () => {
    expect(() => assertEvidenceFileInput({ contentType: "application/pdf", sizeBytes: 1_024 })).not.toThrow();
    expect(() => assertEvidenceFileInput({ contentType: "image/webp", sizeBytes: 1_024 })).not.toThrow();
  });

  it("rejects unsupported types and files larger than the controlled limit", () => {
    expect(() => assertEvidenceFileInput({ contentType: "application/zip", sizeBytes: 1_024 })).toThrow("Only PDF, JPG, PNG, and WebP");
    expect(() => assertEvidenceFileInput({ contentType: "image/png", sizeBytes: 8_000_001 })).toThrow("between 1 byte and 8 MB");
  });

  it("rejects a file link that crosses a tenant or branch boundary", () => {
    expect(() => assertEvidenceLinkScope({ requestedOrganisationId: "org-a", requestedBranchId: "branch-a", linkedOrganisationId: "org-b", linkedBranchId: "branch-a" })).toThrow("authorised organisation and branch");
    expect(() => assertEvidenceLinkScope({ requestedOrganisationId: "org-a", requestedBranchId: "branch-a", linkedOrganisationId: "org-a", linkedBranchId: "branch-a" })).not.toThrow();
  });
});
