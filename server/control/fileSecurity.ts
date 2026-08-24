import { TRPCError } from "@trpc/server";

export const allowedEvidenceMimeTypes = ["application/pdf", "image/jpeg", "image/png"] as const;

export function assertEvidenceFileInput(input: { contentType: string; sizeBytes: number }) {
  if (!(allowedEvidenceMimeTypes as readonly string[]).includes(input.contentType)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Only PDF, JPG, and PNG evidence files are permitted." });
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 1 || input.sizeBytes > 8_000_000) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Evidence files must be between 1 byte and 8 MB." });
  }
}

export function assertEvidenceLinkScope(input: {
  requestedOrganisationId: string;
  requestedBranchId: string;
  linkedOrganisationId: string;
  linkedBranchId: string;
}) {
  if (input.requestedOrganisationId !== input.linkedOrganisationId || input.requestedBranchId !== input.linkedBranchId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Evidence files can only be linked within the authorised organisation and branch." });
  }
}
