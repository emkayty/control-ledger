import { describe, expect, it } from "vitest";
import { filterVarianceQueue, outstandingVarianceTotals } from "./varianceQueue";

describe("variance queue helpers", () => {
  const cases = [
    { status: "open", currency: "NGN", valueImpactMinor: "100" },
    { status: "investigating", currency: "NGN", valueImpactMinor: "200" },
    { status: "pending_approval", currency: "NGN", valueImpactMinor: "300" },
    { status: "resolved", currency: "NGN", valueImpactMinor: "400" },
    { status: "rejected", currency: "USD", valueImpactMinor: "500" },
  ];

  it("keeps approval decisions separate from open investigation work and final history", () => {
    expect(filterVarianceQueue(cases, "open").map(item => item.status)).toEqual(["open", "investigating"]);
    expect(filterVarianceQueue(cases, "pending_approval").map(item => item.status)).toEqual(["pending_approval"]);
    expect(filterVarianceQueue(cases, "resolved").map(item => item.status)).toEqual(["resolved"]);
  });

  it("derives outstanding totals using exact integer minor units and excludes final cases", () => {
    expect(outstandingVarianceTotals(cases)).toEqual([["NGN", BigInt(600)]]);
  });
});
