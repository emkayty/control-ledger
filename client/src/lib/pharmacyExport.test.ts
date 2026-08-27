import { describe, expect, it } from "vitest";
import { pharmacyRequestsCsv, pharmacyRequestsExportFilename } from "./pharmacyExport";

const scope = { organisationName: "Ace & Co", branchName: "Main branch" };
const request = {
  sourceReference: "REQ-20260827-001",
  status: "pending_review" as const,
  createdAt: new Date("2026-08-27T10:00:00.000Z"),
  lines: [{ productName: "=Not patient data", batchCode: "LOT-1", expiryAt: new Date("2027-01-01T00:00:00.000Z"), quantity: "2" }],
  decisions: [{ decision: "returned", rationale: "=Formula-shaped text is escaped", createdAt: new Date("2026-08-27T10:01:00.000Z") }],
};

describe("pharmacyRequestsCsv", () => {
  it("exports only controlled operational fields with spreadsheet-formula protection", () => {
    const csv = pharmacyRequestsCsv(scope, [request], new Date("2026-08-27T12:00:00.000Z"));
    expect(csv).toContain("Request reference");
    expect(csv).toContain("REQ-20260827-001");
    expect(csv).toContain("'=Not patient data");
    expect(csv).toContain("'=Formula-shaped text is escaped");
    expect(csv).not.toContain("Prescription ID");
    expect(csv).not.toContain("Patient name");
  });

  it("creates a scope-safe filename", () => {
    expect(pharmacyRequestsExportFilename(scope, new Date("2026-08-27T12:00:00.000Z"))).toBe("control-ledger-ace-co-main-branch-pharmacy-dispensing-requests-2026-08-27.csv");
  });
});
