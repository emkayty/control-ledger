// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageFallback } from "./App";

describe("PageFallback", () => {
  it("keeps controlled workspace context visible while a specialised route loads", () => {
    render(<PageFallback />);

    expect(screen.getByRole("status", { name: "Preparing controlled workspace" })).toBeTruthy();
    expect(screen.getByText("Preparing your workspace")).toBeTruthy();
    expect(screen.getByText(/No action is being submitted/i)).toBeTruthy();
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(4);
  });
});
