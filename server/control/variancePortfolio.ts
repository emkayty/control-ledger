export type VarianceExceptionRow = { branchId: string; status: string; currency: string | null; valueImpactMinor: string | null };
export type ActiveBranchRow = { id: string; name: string; code: string };

export function summariseVariancePortfolio(exceptions: VarianceExceptionRow[], branches: ActiveBranchRow[]) {
  const active = exceptions.filter(item => !["resolved", "rejected"].includes(item.status));
  const branchLookup = new Map(branches.map(branch => [branch.id, branch]));
  const grouped = new Map<string, { branchId: string; branchName: string; branchCode: string; count: number; totals: Record<string, bigint> }>();
  for (const item of active) {
    const branch = branchLookup.get(item.branchId);
    if (!branch) continue;
    const entry = grouped.get(item.branchId) ?? { branchId: branch.id, branchName: branch.name, branchCode: branch.code, count: 0, totals: {} };
    entry.count += 1;
    const currency = item.currency ?? "NGN";
    entry.totals[currency] = (entry.totals[currency] ?? BigInt(0)) + BigInt(item.valueImpactMinor ?? "0");
    grouped.set(item.branchId, entry);
  }
  const totals: Record<string, bigint> = {};
  for (const row of Array.from(grouped.values())) for (const [currency, total] of Object.entries(row.totals) as Array<[string, bigint]>) totals[currency] = (totals[currency] ?? BigInt(0)) + total;
  return {
    openCount: active.length,
    totals: Object.fromEntries((Object.entries(totals) as Array<[string, bigint]>).map(([currency, total]) => [currency, total.toString()])),
    branches: Array.from(grouped.values()).map(row => ({ ...row, totals: Object.fromEntries((Object.entries(row.totals) as Array<[string, bigint]>).map(([currency, total]) => [currency, total.toString()])) })).sort((a, b) => b.count - a.count || a.branchName.localeCompare(b.branchName)),
  };
}
