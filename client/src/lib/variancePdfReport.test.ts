import { describe, expect, it } from "vitest";
import { varianceReportFilename } from "./variancePdfReport";

describe("variance PDF report helpers", () => {
  it("builds a scoped, filename-safe PDF name without attachment storage data", () => {
    expect(varianceReportFilename({ organisationName: "Ace Distribution", branchName: "Main / 01", exportedAt: new Date("2026-08-27T10:00:00.000Z"), variance: { id: "case-1", title: "Unmatched receipt #1", status: "open", type: "unmatched_record", severity: "medium", dueAt: null, valueImpactMinor: "2999778", currency: "NGN", resolutionNote: null }, notes: [], suggestions: [], decisions: [] })).toBe("control-ledger-ace-distribution-main-01-unmatched-receipt-1-2026-08-27.pdf");
  });
});
