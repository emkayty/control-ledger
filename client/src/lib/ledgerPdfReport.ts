import { jsPDF } from "jspdf";
import type { LedgerAccountExportRow, LedgerBalanceExportRow, LedgerExportScope, LedgerJournalExportRow } from "./ledgerExport";

export type LedgerPdfReportModel = {
  scope: LedgerExportScope;
  periodLabel: string;
  exportedAt: Date;
  balances: LedgerBalanceExportRow[];
  journalLines: Array<{ preparedAt: Date; journalId: string; status: string; sourceReference: string; accountCode: string; accountName: string; currency: string; debitMinor: string; creditMinor: string }>;
};

export function ledgerPeriodLabel(fromDate?: string, toDate?: string) {
  if (fromDate && toDate) return `${fromDate} to ${toDate} (inclusive UTC)`;
  if (fromDate) return `From ${fromDate} (inclusive UTC)`;
  if (toDate) return `Up to ${toDate} (inclusive UTC)`;
  return "All prepared dates";
}

export function buildLedgerPdfReport(scope: LedgerExportScope, balances: LedgerBalanceExportRow[], journals: LedgerJournalExportRow[], accounts: LedgerAccountExportRow[], exportedAt: Date, fromDate?: string, toDate?: string): LedgerPdfReportModel {
  const accountById = new Map(accounts.map(account => [account.id, account]));
  return {
    scope,
    periodLabel: ledgerPeriodLabel(fromDate, toDate),
    exportedAt,
    balances,
    journalLines: journals.flatMap(journal => journal.lines.map(line => {
      const account = accountById.get(line.accountId);
      return { preparedAt: journal.preparedAt, journalId: journal.id, status: journal.status, sourceReference: journal.sourceReference ?? journal.sourceType, accountCode: account?.code ?? "Unknown", accountName: account?.name ?? "Unknown account", currency: journal.currency, debitMinor: String(line.debitMinor), creditMinor: String(line.creditMinor) };
    })),
  };
}

function reportFilename(scope: LedgerExportScope, exportedAt: Date) {
  const normalise = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "scope";
  return `control-ledger-${normalise(scope.organisationName)}-${normalise(scope.branchName)}-report-${exportedAt.toISOString().slice(0, 10)}.pdf`;
}

export function downloadLedgerPdf(report: LedgerPdfReportModel) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36; let y = margin;
  const header = () => {
    doc.setFillColor(7, 37, 43); doc.rect(0, 0, pageWidth, 78, "F");
    doc.setTextColor(232, 253, 250); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("Control Ledger", margin, 34);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text("Economic control report · read-only export", margin, 51);
    y = 104; doc.setTextColor(19, 41, 45);
  };
  const nextPage = () => { doc.addPage(); header(); };
  const ensureSpace = (height: number) => { if (y + height > pageHeight - margin) nextPage(); };
  const text = (value: string, x: number, width: number, options: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => {
    doc.setFont("helvetica", options.bold ? "bold" : "normal"); doc.setFontSize(options.size ?? 9); doc.setTextColor(...(options.color ?? [19, 41, 45]));
    const lines = doc.splitTextToSize(value, width); ensureSpace(lines.length * 11); doc.text(lines, x, y); return lines.length * 11;
  };
  const section = (title: string) => { ensureSpace(30); doc.setDrawColor(192, 230, 223); doc.line(margin, y, pageWidth - margin, y); y += 17; doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(12, 111, 102); doc.text(title, margin, y); y += 18; };
  const tableHeader = (columns: Array<{ label: string; x: number; width: number }>) => { ensureSpace(22); doc.setFillColor(234, 246, 243); doc.roundedRect(margin, y - 12, pageWidth - margin * 2, 18, 4, 4, "F"); columns.forEach(column => { doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(25, 75, 70); doc.text(column.label, column.x, y); }); y += 14; };

  header();
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(19, 41, 45); doc.text("Ledger report", margin, y); y += 19;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(74, 95, 98);
  doc.text(`Organisation: ${report.scope.organisationName}   ·   Branch: ${report.scope.branchName}`, margin, y); y += 14;
  doc.text(`Journal period: ${report.periodLabel}   ·   Generated UTC: ${report.exportedAt.toISOString()}`, margin, y); y += 24;

  section("Current derived account balances");
  if (!report.balances.length) {
    text("No independently posted account balance exists in the active scope. Prepared journals are not included in this balance view.", margin, pageWidth - margin * 2, { size: 9, color: [74, 95, 98] }); y += 10;
  } else {
    const columns = [{ label: "Code", x: margin + 4, width: 54 }, { label: "Account", x: margin + 66, width: 190 }, { label: "Class", x: margin + 266, width: 70 }, { label: "Currency", x: margin + 344, width: 50 }, { label: "Debit minor", x: margin + 406, width: 76 }, { label: "Credit minor", x: margin + 494, width: 76 }, { label: "Balance minor", x: margin + 582, width: 84 }];
    tableHeader(columns);
    report.balances.forEach(balance => { ensureSpace(15); [balance.accountCode, balance.accountName, balance.accountClass, balance.currency, balance.debitMinor, balance.creditMinor, balance.balanceMinor].forEach((value, index) => text(value, columns[index]!.x, columns[index]!.width, { size: 8, bold: index === 0 })); y += 3; });
  }

  section("Journal-entry lines for selected period");
  if (!report.journalLines.length) {
    text("No scoped journal lines were prepared in the selected period. No rows were added to this report.", margin, pageWidth - margin * 2, { size: 9, color: [74, 95, 98] });
  } else {
    const columns = [{ label: "Prepared UTC", x: margin + 4, width: 92 }, { label: "Journal", x: margin + 102, width: 82 }, { label: "Status", x: margin + 190, width: 52 }, { label: "Source", x: margin + 248, width: 112 }, { label: "Account", x: margin + 366, width: 150 }, { label: "CCY", x: margin + 522, width: 34 }, { label: "Debit minor", x: margin + 562, width: 70 }, { label: "Credit minor", x: margin + 638, width: 70 }];
    tableHeader(columns);
    report.journalLines.forEach(line => { ensureSpace(15); const values = [line.preparedAt.toISOString().replace("T", " ").slice(0, 19), line.journalId.slice(0, 8), line.status, line.sourceReference, `${line.accountCode} · ${line.accountName}`, line.currency, line.debitMinor, line.creditMinor]; values.forEach((value, index) => text(value, columns[index]!.x, columns[index]!.width, { size: 7.5, bold: index === 1 })); y += 3; });
  }
  doc.setProperties({ title: `Control Ledger report · ${report.scope.organisationName}`, subject: report.periodLabel, author: "Control Ledger" });
  doc.save(reportFilename(report.scope, report.exportedAt));
}
