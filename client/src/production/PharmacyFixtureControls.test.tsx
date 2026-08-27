// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import PharmacyFixtureControls, { FixtureModeHeaderBadge, FixtureSafetyNotice } from "./PharmacyFixtureControls";

describe("production PharmacyFixtureControls", () => {
  it("renders neither the local fixture switch nor a synthetic-data notice", () => {
    const controls = render(<PharmacyFixtureControls fixtureMode={false} onLoad={vi.fn()} onClear={vi.fn()} />);
    const notice = render(<FixtureSafetyNotice />);
    const badge = render(<FixtureModeHeaderBadge />);

    expect(controls.container.childElementCount).toBe(0);
    expect(notice.container.childElementCount).toBe(0);
    expect(badge.container.childElementCount).toBe(0);
  });
});
