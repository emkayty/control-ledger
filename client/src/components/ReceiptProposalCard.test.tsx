// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReceiptPreviewButton, ReceiptProposalCard } from "./ReceiptProposalCard";

describe("receipt proposal controls", () => {
  it("renders the secure preview control and invokes it on request", () => {
    const onPreview = vi.fn();
    render(<ReceiptPreviewButton onPreview={onPreview} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(onPreview).toHaveBeenCalledOnce();
  });

  it("shows the OPay proposal and passes reviewed fields into the evidence-form handoff", () => {
    const onReview = vi.fn();
    render(<ReceiptProposalCard proposal={{ provider: "OPay", sourceReference: "260819060100009169870983", amountMinor: "3000000", currency: "NGN", occurredAtIso: "2026-08-19T22:34:05", confidence: "high", notes: "Visible receipt fields" }} onReview={onReview} />);
    expect(screen.getByText("NGN 30,000.00 · 260819060100009169870983")).toBeTruthy();
    expect(screen.getByText(/not proof of settlement/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Review in evidence form" }));
    expect(onReview).toHaveBeenCalledOnce();
  });
});
