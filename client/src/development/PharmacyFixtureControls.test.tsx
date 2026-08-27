// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PharmacyFixtureControls, { FixtureQueueLoadingSkeleton } from "./PharmacyFixtureControls";

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
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
    expect(onLoad).not.toHaveBeenCalled();

    vi.advanceTimersByTime(180);

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

  it("labels the standalone local preparation skeleton without suggesting a provider request", () => {
    render(<FixtureQueueLoadingSkeleton />);

    expect(screen.getByRole("status").textContent).toMatch(/No Pharmacy service is called/i);
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
  });
});
