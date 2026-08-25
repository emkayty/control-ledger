import { describe, expect, it } from "vitest";
import { getLiveValidationGuidance } from "./control";

describe("live validation guidance", () => {
  it("keeps evidence validation pending until a real record exists", () => {
    expect(getLiveValidationGuidance(0, 0).title).toBe("Requires authorised live validation");
  });

  it("reports a recorded evidence variance as live validation rather than a pending task", () => {
    const guidance = getLiveValidationGuidance(1, 1);
    expect(guidance.title).toBe("Live evidence validation recorded");
    expect(guidance.message).toContain("variance is visible");
  });
});
