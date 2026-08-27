// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PharmacyPrototypePage from "./PharmacyPrototypePage";

afterEach(cleanup);

describe("pharmacy dispensing prototype", () => {
  it("shows a non-operational pharmacist gate and does not expose a supply action", () => {
    render(<PharmacyPrototypePage />);

    expect(screen.getByText("No dispensing enabled")).toBeTruthy();
    expect(screen.getByText(/does not store a prescription, patient record, batch, approval, sale, or stock movement/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Pharmacist approval is not enabled" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /supply|dispense|reserve batch/i })).toBeNull();
  });

  it("reveals required pharmacist checks without creating an approval", () => {
    render(<PharmacyPrototypePage />);

    fireEvent.click(screen.getByRole("button", { name: "Show required review checks" }));

    expect(screen.getByLabelText("Required pharmacist review checks")).toBeTruthy();
    expect(screen.getByText(/licensed pharmacist reviews the source order/i)).toBeTruthy();
    expect(screen.getByText(/cannot capture approval, reserve a batch, or record supply/i)).toBeTruthy();
  });
});
