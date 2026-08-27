export type PharmacyRequestStatus = "draft" | "pending_review" | "returned" | "rejected" | "approved_for_supply" | "supplied";
export type PharmacyRequestUrgency = "urgent" | "attention" | "standard" | "completed";
export type PharmacyQueueSort = "newest" | "oldest" | "urgency" | "status";

export type PharmacyQueueRecord = {
  id: string;
  status: PharmacyRequestStatus;
  createdAt: Date | string;
  sourceReference?: string;
};

export type PharmacyQueueFilters = {
  status: "all" | PharmacyRequestStatus;
  urgency: "all" | PharmacyRequestUrgency;
  from?: string;
  to?: string;
  search?: string;
  sort: PharmacyQueueSort;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function timestamp(value: Date | string) {
  return new Date(value).getTime();
}

export function pharmacyRequestUrgency(record: Pick<PharmacyQueueRecord, "status" | "createdAt">, now = new Date()): PharmacyRequestUrgency {
  if (record.status === "supplied" || record.status === "rejected") return "completed";
  const ageDays = Math.max(0, now.getTime() - timestamp(record.createdAt)) / DAY_MS;
  if ((record.status === "pending_review" || record.status === "approved_for_supply") && ageDays >= 1) return "urgent";
  if (record.status === "pending_review" || record.status === "approved_for_supply" || record.status === "returned" || ageDays >= 2) return "attention";
  return "standard";
}

function rankUrgency(urgency: PharmacyRequestUrgency) {
  return { urgent: 0, attention: 1, standard: 2, completed: 3 }[urgency];
}

function isWithinDate(record: PharmacyQueueRecord, from?: string, to?: string) {
  const time = timestamp(record.createdAt);
  if (from && time < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && time > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}

export function filterAndSortPharmacyQueue<T extends PharmacyQueueRecord>(records: T[], filters: PharmacyQueueFilters, now = new Date()) {
  const query = filters.search?.trim().toLowerCase() ?? "";
  return records
    .filter(record => (filters.status === "all" || record.status === filters.status) && isWithinDate(record, filters.from, filters.to))
    .filter(record => !query || record.sourceReference?.toLowerCase().includes(query))
    .filter(record => filters.urgency === "all" || pharmacyRequestUrgency(record, now) === filters.urgency)
    .sort((left, right) => {
      const leftTime = timestamp(left.createdAt);
      const rightTime = timestamp(right.createdAt);
      if (filters.sort === "oldest") return leftTime - rightTime;
      if (filters.sort === "newest") return rightTime - leftTime;
      if (filters.sort === "urgency") return rankUrgency(pharmacyRequestUrgency(left, now)) - rankUrgency(pharmacyRequestUrgency(right, now)) || rightTime - leftTime;
      return left.status.localeCompare(right.status) || rightTime - leftTime;
    });
}
