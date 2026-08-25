// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReceiptExtractionPolicyCard } from "./ReceiptExtractionPolicyCard";

describe("receipt extraction policy card", () => {
  it("shows the fail-closed processing boundary and owner review action while extraction is disabled", () => {
    const onManage = vi.fn();
    render(<ReceiptExtractionPolicyCard enabled={false} acceptedAt={null} acceptedBy={null} isOwner onManage={onManage} />);
    expect(screen.getByText("OPay extraction is disabled for this organisation")).toBeTruthy();
    expect(screen.getByText(/does not create evidence, reconcile value, or prove settlement/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Review processing notice" }));
    expect(onManage).toHaveBeenCalledOnce();
  });

  it("shows enabled state and owner acceptance attribution, without a management action for a non-owner", () => {
    render(<ReceiptExtractionPolicyCard enabled acceptedAt="2026-08-25T13:00:00.000Z" acceptedBy="Owner" isOwner={false} onManage={vi.fn()} />);
    expect(screen.getByText("OPay extraction is enabled for this organisation")).toBeTruthy();
    expect(screen.getByText(/by Owner/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Manage processing policy" })).toBeNull();
  });
});
