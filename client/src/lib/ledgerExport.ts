type Cell = string | number | bigint | Date | null | undefined;

export type LedgerExportScope = { organisationName: string; branchName: string };
export type LedgerBalanceExportRow = { accountCode: string; accountName: string; accountClass: string; normalBalance: string; currency: string; debitMinor: string; creditMinor: string; balanceMinor: string };
export type LedgerJournalExportRow = { id: string; sourceType: string; sourceReference: string | null; status: string; currency: string; memo: string; preparedAt: Date; postedAt: Date | null; reversalOfJournalId: string | null; lines: Array<{ id: string; accountId: string; debitMinor: string | number; creditMinor: string | number; memo?: string | null }> };
export type LedgerAccountExportRow = { id: string; code: string; name: string };

function valueToText(value: Cell) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function csvCell(value: Cell) {
  const text = valueToText(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safeText) ? `"${safeText.replaceAll('"', '""')}"` : safeText;
}

export function buildCsv(headers: string[], rows: Cell[][]) {
  return `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function filenameSafe(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "scope";
}

export function ledgerBalancesCsv(scope: LedgerExportScope, balances: LedgerBalanceExportRow[], exportedAt: Date) {
  return buildCsv(
    ["Organisation", "Branch", "Account code", "Account name", "Account class", "Normal balance", "Currency", "Debit minor", "Credit minor", "Balance minor", "Exported at UTC"],
    balances.map(balance => [scope.organisationName, scope.branchName, balance.accountCode, balance.accountName, balance.accountClass, balance.normalBalance, balance.currency, balance.debitMinor, balance.creditMinor, balance.balanceMinor, exportedAt]),
  );
}

export function ledgerJournalEntriesCsv(scope: LedgerExportScope, journals: LedgerJournalExportRow[], accounts: LedgerAccountExportRow[], exportedAt: Date) {
  const accountById = new Map(accounts.map(account => [account.id, account]));
  return buildCsv(
    ["Organisation", "Branch", "Journal ID", "Journal status", "Source type", "Source reference", "Currency", "Journal memo", "Prepared at UTC", "Posted at UTC", "Reversal of journal ID", "Line ID", "Account code", "Account name", "Debit minor", "Credit minor", "Line memo", "Exported at UTC"],
    journals.flatMap(journal => journal.lines.map(line => {
      const account = accountById.get(line.accountId);
      return [scope.organisationName, scope.branchName, journal.id, journal.status, journal.sourceType, journal.sourceReference, journal.currency, journal.memo, journal.preparedAt, journal.postedAt, journal.reversalOfJournalId, line.id, account?.code ?? "Unknown", account?.name ?? "Unknown account", line.debitMinor, line.creditMinor, line.memo, exportedAt];
    })),
  );
}

export function ledgerExportFilename(scope: LedgerExportScope, kind: "balances" | "journal-entries", exportedAt: Date) {
  const date = exportedAt.toISOString().slice(0, 10);
  return `control-ledger-${filenameSafe(scope.organisationName)}-${filenameSafe(scope.branchName)}-${kind}-${date}.csv`;
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.style.display = "none";
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
