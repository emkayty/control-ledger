import { buildCsv } from "./ledgerExport";
import { pharmacyRequestUrgency, type PharmacyRequestStatus } from "./pharmacyQueue";

type CsvValue = string | number | bigint | Date | null | undefined;

export type PharmacyCsvScope = { organisationName: string; branchName: string };
export type PharmacyCsvRequest = {
  sourceReference: string;
  status: PharmacyRequestStatus;
  createdAt: Date;
  lines: Array<{ productName: string; batchCode: string; expiryAt: Date | null; quantity: string }>;
  decisions: Array<{ decision: string; rationale: string; createdAt: Date }>;
};

function filenameSafe(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "scope";
}

export function pharmacyRequestsCsv(scope: PharmacyCsvScope, requests: PharmacyCsvRequest[], exportedAt: Date) {
  const headers = ["Organisation", "Branch", "Request reference", "Request status", "Urgency", "Created at UTC", "Product", "Batch code", "Batch expiry UTC", "Quantity", "Latest decision", "Latest decision rationale", "Latest decision at UTC", "Exported at UTC"];
  const rows: CsvValue[][] = requests.flatMap(request => {
    const decision = request.decisions[0];
    const common: CsvValue[] = [scope.organisationName, scope.branchName, request.sourceReference, request.status, pharmacyRequestUrgency(request), request.createdAt, decision?.decision, decision?.rationale, decision?.createdAt, exportedAt];
    return request.lines.map(line => [common[0], common[1], common[2], common[3], common[4], common[5], line.productName, line.batchCode, line.expiryAt, line.quantity, common[6], common[7], common[8], common[9]]);
  });
  return buildCsv(headers, rows);
}

export function pharmacyRequestsExportFilename(scope: PharmacyCsvScope, exportedAt: Date) {
  return `control-ledger-${filenameSafe(scope.organisationName)}-${filenameSafe(scope.branchName)}-pharmacy-dispensing-requests-${exportedAt.toISOString().slice(0, 10)}.csv`;
}
