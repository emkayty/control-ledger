import { describe, expect, it } from "vitest";
import { nextExceptionStatus } from "./varianceApproval";

describe("variance approval transitions", () => {
  it("keeps submitted work pending until an independent decision is recorded", () => {
    expect(nextExceptionStatus("submitted")).toBe("pending_approval");
  });

  it("maps only explicit approval to resolution and returns to investigation otherwise", () => {
    expect(nextExceptionStatus("approved")).toBe("resolved");
    expect(nextExceptionStatus("returned")).toBe("investigating");
  });
});
