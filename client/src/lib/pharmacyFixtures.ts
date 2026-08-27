import type { PharmacyRequestStatus } from "./pharmacyQueue";

export type PharmacyFixtureRequest = {
  id: string;
  sourceReference: string;
  status: PharmacyRequestStatus;
  createdByUserId: number;
  createdAt: Date;
  lines: Array<{ id: string; productId: string; stockLotId: string; productName: string; batchCode: string; expiryAt: Date | null; quantity: string }>;
  decisions: Array<{ id: string; decision: string; rationale: string; createdAt: Date }>;
};

function atOffset(now: Date, hoursAgo: number) {
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
}

function fixture(reference: string, status: PharmacyRequestStatus, hoursAgo: number, quantity: string, options: { decision?: "approved" | "returned" | "rejected"; product?: string; batch?: string } = {}, now: Date): PharmacyFixtureRequest {
  const createdAt = atOffset(now, hoursAgo);
  return {
    id: `development-${reference}`,
    sourceReference: reference,
    status,
    createdByUserId: -1,
    createdAt,
    lines: [{ id: `line-${reference}`, productId: "development-product", stockLotId: "development-lot", productName: options.product ?? "Synthetic control product", batchCode: options.batch ?? "TEST-LOT-A", expiryAt: new Date("2030-12-31T00:00:00.000Z"), quantity }],
    decisions: options.decision ? [{ id: `decision-${reference}`, decision: options.decision, rationale: "Synthetic development fixture; no pharmacist decision exists.", createdAt: atOffset(createdAt, -1) }] : [],
  };
}

export function buildPharmacyDevelopmentFixtures(now = new Date()): PharmacyFixtureRequest[] {
  return [
    fixture("REQ-20260827-0001", "draft", 2, "3", { product: "Synthetic control product A", batch: "TEST-LOT-A" }, now),
    fixture("REQ-20260827-0002", "pending_review", 30, "1", { product: "Synthetic control product B", batch: "TEST-LOT-B" }, now),
    fixture("REQ-20260827-0003", "approved_for_supply", 6, "2", { product: "Synthetic control product C", batch: "TEST-LOT-C", decision: "approved" }, now),
    fixture("REQ-20260827-0004", "returned", 78, "4", { product: "Synthetic control product A", batch: "TEST-LOT-A", decision: "returned" }, now),
    fixture("REQ-20260827-0005", "supplied", 8, "1", { product: "Synthetic control product D", batch: "TEST-LOT-D", decision: "approved" }, now),
    fixture("REQ-20260827-0006", "rejected", 12, "2", { product: "Synthetic control product E", batch: "TEST-LOT-E", decision: "rejected" }, now),
  ];
}
