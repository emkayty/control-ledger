// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PharmacyApprovalFeedback, QueueToolbar } from "./PharmacyPrototypePage";

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

  it("searches only through the compact controlled-request-reference filter", () => {
    const onChange = vi.fn();
    render(<QueueToolbar count={0} filters={{ status: "all", urgency: "all", sort: "urgency" }} onChange={onChange} onExport={vi.fn()} exporting={false} />);

    fireEvent.change(screen.getByLabelText("Find by Control Ledger request reference"), { target: { value: "REQ-000427" } });

    expect(onChange).toHaveBeenCalledWith({ search: "REQ-000427" });
    expect(screen.getByText(/does not search or store patient names, prescription identifiers/i)).toBeTruthy();
  });
});
