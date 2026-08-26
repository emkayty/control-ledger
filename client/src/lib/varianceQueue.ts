export type VarianceFilter = "open" | "pending_approval" | "resolved" | "all";

export type VarianceQueueItem = {
  status: string;
  currency: string | null;
  valueImpactMinor: string | number;
};

export const isFinalVarianceStatus = (status: string) => ["resolved", "rejected"].includes(status);

export function filterVarianceQueue<T extends VarianceQueueItem>(items: T[], filter: VarianceFilter) {
  if (filter === "all") return items;
  if (filter === "open") return items.filter(item => !isFinalVarianceStatus(item.status) && item.status !== "pending_approval");
  return items.filter(item => item.status === filter);
}

export function outstandingVarianceTotals(items: VarianceQueueItem[]) {
  const totals = new Map<string, bigint>();
  for (const item of items) {
    if (isFinalVarianceStatus(item.status)) continue;
    const currency = item.currency ?? "NGN";
    totals.set(currency, (totals.get(currency) ?? BigInt(0)) + BigInt(item.valueImpactMinor));
  }
  return Array.from(totals.entries());
}
