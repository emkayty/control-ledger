import { describe, expect, it } from "vitest";
import { buildPharmacyDevelopmentFixtures } from "./pharmacyFixtures";

describe("buildPharmacyDevelopmentFixtures", () => {
  it("returns deterministic synthetic operational shapes without patient or prescription fields", () => {
    const fixtures = buildPharmacyDevelopmentFixtures(new Date("2026-08-27T12:00:00.000Z"));
    expect(fixtures).toHaveLength(6);
    expect(fixtures.map(item => item.sourceReference)).toContain("REQ-20260827-0002");
    expect(fixtures.find(item => item.status === "pending_review")?.createdAt.toISOString()).toBe("2026-08-26T06:00:00.000Z");
    expect(JSON.stringify(fixtures)).not.toMatch(/patient|prescription|dose|prescriber/i);
  });
});
