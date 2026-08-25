/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ManusDialog } from "./ManusDialog";

describe("ManusDialog", () => {
  it("renders a fallback accessible title when no custom title is provided", () => {
    render(<ManusDialog open onLogin={() => undefined} />);
    expect(screen.getByRole("heading", { name: "Sign in to continue" })).toBeTruthy();
  });
});
