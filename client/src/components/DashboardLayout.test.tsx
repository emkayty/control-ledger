// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceScopeSelector } from "./DashboardLayout";

describe("WorkspaceScopeSelector", () => {
  const organisations = [{ id: "ace", name: "Ace Distribution" }, { id: "north", name: "North Distribution" }];
  const branches = [{ id: "main", name: "Main branch" }, { id: "kad-09", name: "Kaduna 09" }];

  it("keeps organisation and branch changes explicit for compact mobile navigation", () => {
    const onOrganisationChange = vi.fn();
    const onBranchChange = vi.fn();
    render(<WorkspaceScopeSelector organisations={organisations} branches={branches} selectedOrganisationId="ace" selectedBranchId="main" onOrganisationChange={onOrganisationChange} onBranchChange={onBranchChange} />);

    fireEvent.change(screen.getByLabelText("Select working organisation"), { target: { value: "north" } });
    fireEvent.change(screen.getByLabelText("Select working branch"), { target: { value: "kad-09" } });

    expect(onOrganisationChange).toHaveBeenCalledWith("north");
    expect(onBranchChange).toHaveBeenCalledWith("kad-09");
  });
});
