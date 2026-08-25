import { describe, expect, it } from "vitest";
import { summariseVariancePortfolio } from "./variancePortfolio";

describe("cross-branch variance portfolio", () => {
  it("totals only open variances by authorised branch and currency", () => {
    const result = summariseVariancePortfolio([
      { branchId: "main", status: "open", currency: "NGN", valueImpactMinor: "2999778" },
      { branchId: "kad", status: "investigating", currency: "NGN", valueImpactMinor: "500" },
      { branchId: "main", status: "resolved", currency: "NGN", valueImpactMinor: "700" },
    ], [{ id: "main", name: "Main branch", code: "MAIN" }, { id: "kad", name: "kaduna", code: "KAD-09" }]);

    expect(result).toEqual({ openCount: 2, totals: { NGN: "3000278" }, branches: [{ branchId: "kad", branchName: "kaduna", branchCode: "KAD-09", count: 1, totals: { NGN: "500" } }, { branchId: "main", branchName: "Main branch", branchCode: "MAIN", count: 1, totals: { NGN: "2999778" } }] });
  });
});
