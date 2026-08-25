import { describe, expect, it } from "vitest";
import { buildLedgerPdfReport, ledgerPeriodLabel } from "./ledgerPdfReport";

const scope = { organisationName: "Ace", branchName: "Main branch" };
const exportedAt = new Date("2026-08-25T16:00:00.000Z");

describe("Ledger PDF report model", () => {
  it("uses explicit inclusive UTC period labels", () => {
    expect(ledgerPeriodLabel("2026-08-01", "2026-08-25")).toBe("2026-08-01 to 2026-08-25 (inclusive UTC)");
    expect(ledgerPeriodLabel()).toBe("All prepared dates");
  });

  it("keeps only supplied scoped journal lines and resolves account labels", () => {
    const report = buildLedgerPdfReport(scope, [{ accountCode: "1100", accountName: "Trade receivables", accountClass: "asset", normalBalance: "debit", currency: "NGN", debitMinor: "100", creditMinor: "0", balanceMinor: "100" }], [{ id: "journal-1", sourceType: "invoice", sourceReference: "INV-1", status: "posted", currency: "NGN", memo: "Recognition", preparedAt: exportedAt, postedAt: exportedAt, reversalOfJournalId: null, lines: [{ id: "line-1", accountId: "account-1", debitMinor: "100", creditMinor: "0" }] }], [{ id: "account-1", code: "1100", name: "Trade receivables" }], exportedAt, "2026-08-01", "2026-08-25");
    expect(report.periodLabel).toBe("2026-08-01 to 2026-08-25 (inclusive UTC)");
    expect(report.journalLines).toEqual([expect.objectContaining({ journalId: "journal-1", accountCode: "1100", debitMinor: "100", creditMinor: "0" })]);
  });
});
