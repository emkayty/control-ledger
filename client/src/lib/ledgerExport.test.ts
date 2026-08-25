import { describe, expect, it } from "vitest";
import { buildCsv, ledgerBalancesCsv, ledgerExportFilename, ledgerJournalEntriesCsv } from "./ledgerExport";

const scope = { organisationName: "Ace, Distribution", branchName: "Main branch" };
const exportedAt = new Date("2026-08-25T14:00:00.000Z");

describe("ledger CSV export", () => {
  it("quotes delimiters and neutralises spreadsheet formula cells", () => {
    const csv = buildCsv(["Name", "Value"], [["=SUM(A1:A2)", "Ace, Distribution"], ["Line\nbreak", 'A "quote"']]);
    expect(csv).toBe("\uFEFFName,Value\r\n'=SUM(A1:A2),\"Ace, Distribution\"\r\n\"Line\nbreak\",\"A \"\"quote\"\"\"\r\n");
  });

  it("exports balances with scope and exact minor-unit columns", () => {
    const csv = ledgerBalancesCsv(scope, [{ accountCode: "1100", accountName: "Trade receivables", accountClass: "asset", normalBalance: "debit", currency: "NGN", debitMinor: "100000", creditMinor: "0", balanceMinor: "100000" }], exportedAt);
    expect(csv).toContain('"Ace, Distribution",Main branch,1100,Trade receivables,asset,debit,NGN,100000,0,100000,2026-08-25T14:00:00.000Z');
  });

  it("exports each journal line with its mapped account and stable filename", () => {
    const csv = ledgerJournalEntriesCsv(scope, [{ id: "journal-1", sourceType: "invoice", sourceReference: "INV-1", status: "posted", currency: "NGN", memo: "Invoice recognition", preparedAt: exportedAt, postedAt: exportedAt, reversalOfJournalId: null, lines: [{ id: "line-1", accountId: "account-1", debitMinor: "100000", creditMinor: "0", memo: "Debit receivable" }] }], [{ id: "account-1", code: "1100", name: "Trade receivables" }], exportedAt);
    expect(csv).toContain("journal-1,posted,invoice,INV-1,NGN,Invoice recognition,2026-08-25T14:00:00.000Z,2026-08-25T14:00:00.000Z,,line-1,1100,Trade receivables,100000,0,Debit receivable,2026-08-25T14:00:00.000Z");
    expect(ledgerExportFilename(scope, "journal-entries", exportedAt)).toBe("control-ledger-ace-distribution-main-branch-journal-entries-2026-08-25.csv");
  });
});
