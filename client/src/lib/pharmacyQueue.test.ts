import { describe, expect, it } from "vitest";
import { filterAndSortPharmacyQueue, pharmacyRequestUrgency } from "./pharmacyQueue";

const now = new Date("2026-08-27T12:00:00.000Z");
const records = [
  { id: "draft", status: "draft" as const, createdAt: new Date("2026-08-27T09:00:00.000Z") },
  { id: "urgent", status: "pending_review" as const, createdAt: new Date("2026-08-25T09:00:00.000Z") },
  { id: "attention", status: "returned" as const, createdAt: new Date("2026-08-26T09:00:00.000Z") },
  { id: "done", status: "supplied" as const, createdAt: new Date("2026-08-24T09:00:00.000Z") },
];

describe("Pharmacy dispensing queue filters", () => {
  it("derives urgency without persisting or changing the request", () => {
    expect(pharmacyRequestUrgency(records[1], now)).toBe("urgent");
    expect(pharmacyRequestUrgency(records[2], now)).toBe("attention");
    expect(pharmacyRequestUrgency(records[0], now)).toBe("standard");
    expect(pharmacyRequestUrgency(records[3], now)).toBe("completed");
  });

  it("filters the read-only queue by status, urgency, and inclusive date range", () => {
    expect(filterAndSortPharmacyQueue(records, { status: "all", urgency: "urgent", sort: "newest" }, now).map(item => item.id)).toEqual(["urgent"]);
    expect(filterAndSortPharmacyQueue(records, { status: "returned", urgency: "all", from: "2026-08-26", to: "2026-08-26", sort: "oldest" }, now).map(item => item.id)).toEqual(["attention"]);
  });

  it("sorts operational attention ahead of standard and completed work", () => {
    expect(filterAndSortPharmacyQueue(records, { status: "all", urgency: "all", sort: "urgency" }, now).map(item => item.id)).toEqual(["urgent", "attention", "draft", "done"]);
  });
});
