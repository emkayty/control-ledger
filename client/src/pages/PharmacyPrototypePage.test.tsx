// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PharmacyApprovalFeedback } from "./PharmacyPrototypePage";

afterEach(cleanup);

describe("pharmacy real-time approval feedback", () => {
  it("reports that a controlled batch revalidation is in progress", () => {
    render(<PharmacyApprovalFeedback loading eligible={false} />);

    expect(screen.getByText("Rechecking controlled batch eligibility…")).toBeTruthy();
  });

  it("communicates an ineligible batch without implying approval or supply", () => {
    const { rerender } = render(<PharmacyApprovalFeedback loading={false} eligible={false} reason="The selected batch is expired and cannot be supplied." />);
    expect(screen.getByText("The selected batch is expired and cannot be supplied.")).toBeTruthy();

    rerender(<PharmacyApprovalFeedback loading={false} eligible reason="Batch is active, in date, and sufficient." />);
    expect(screen.getByText("Batch is currently eligible for pharmacist review.")).toBeTruthy();
  });
});
