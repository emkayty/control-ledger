// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PharmacyFixtureControls from "./PharmacyFixtureControls";

afterEach(cleanup);

describe("PharmacyFixtureControls", () => {
  it("generates only local synthetic fixtures after an explicit development click", async () => {
    const onLoad = vi.fn();
    render(<PharmacyFixtureControls fixtureMode={false} onLoad={onLoad} onClear={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Load local test queue" }));

    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
    const fixtures = onLoad.mock.calls[0][0];
    expect(fixtures).toHaveLength(6);
    expect(fixtures[0].sourceReference).toMatch(/^REQ-/);
    expect(screen.getByText(/never calls a Pharmacy write service/i)).toBeTruthy();
  });

  it("returns to the authorised queue through the local clear callback", () => {
    const onClear = vi.fn();
    render(<PharmacyFixtureControls fixtureMode onLoad={vi.fn()} onClear={onClear} />);

    fireEvent.click(screen.getByRole("button", { name: "Return to authorised queue" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
