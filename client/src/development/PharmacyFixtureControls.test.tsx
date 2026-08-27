// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import PharmacyFixtureControls, { FixtureModeHeaderBadge, FixtureQueueLoadingSkeleton } from "./PharmacyFixtureControls";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("PharmacyFixtureControls", () => {
  it("uses a visual switch to prepare only local synthetic fixtures", () => {
    vi.useFakeTimers();
    const onLoad = vi.fn();
    render(<PharmacyFixtureControls fixtureMode={false} onLoad={onLoad} onClear={vi.fn()} />);

    const fixtureSwitch = screen.getByRole("switch", { name: "Use local synthetic test queue" });
    expect(fixtureSwitch.getAttribute("data-state")).toBe("unchecked");
    expect(screen.getByText(/current authorised scoped queue/i)).toBeTruthy();

    fireEvent.click(fixtureSwitch);

    expect(screen.getByRole("status").textContent).toMatch(/Preparing local test queue/i);
    expect(screen.getByRole("progressbar", { name: "Local test queue preparation" }).getAttribute("aria-valuenow")).toBe("12");
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
    expect(onLoad).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(85));
    expect(screen.getByText("68% ready")).toBeTruthy();

    act(() => vi.advanceTimersByTime(95));

    expect(onLoad).toHaveBeenCalledTimes(1);
    const fixtures = onLoad.mock.calls[0][0];
    expect(fixtures).toHaveLength(6);
    expect(fixtures[0].sourceReference).toMatch(/^REQ-/);
  });

  it("returns to the authorised queue through the local switch callback", () => {
    const onClear = vi.fn();
    render(<PharmacyFixtureControls fixtureMode onLoad={vi.fn()} onClear={onClear} />);

    const fixtureSwitch = screen.getByRole("switch", { name: "Use local synthetic test queue" });
    expect(fixtureSwitch.getAttribute("data-state")).toBe("checked");
    fireEvent.click(fixtureSwitch);

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("labels the pulsing local preparation skeleton with truthful progress and no provider request", () => {
    render(<FixtureQueueLoadingSkeleton progress={64} />);

    expect(screen.getByRole("status").textContent).toMatch(/No Pharmacy service is called/i);
    expect(screen.getByText("64% ready")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Local test queue preparation" }).getAttribute("aria-valuenow")).toBe("64");
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
  });

  it("renders a persistent, plainly synthetic local-mode header badge", () => {
    render(<FixtureModeHeaderBadge />);
    expect(screen.getByTestId("fixture-header-badge").textContent).toMatch(/Local test queue active.*synthetic data/i);
  });
});
