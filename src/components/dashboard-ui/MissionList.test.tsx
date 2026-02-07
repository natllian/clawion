import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MissionIndexItem } from "@/core/schemas";
import { MissionList } from "./MissionList";

describe("MissionList", () => {
	const mockMissions: MissionIndexItem[] = [
		{
			id: "m1",
			name: "Alpha Mission",
			path: "/tmp/m1",
			status: "active",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		{
			id: "m2",
			name: "Beta Mission",
			path: "/tmp/m2",
			status: "completed",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	];

	const defaultProps = {
		missions: mockMissions,
		activeMissionId: null as string | null,
		loadingMissions: false,
		sidebarCollapsed: false,
	};

	afterEach(() => {
		cleanup();
	});

	it("renders mission list", () => {
		render(<MissionList {...defaultProps} />);
		expect(screen.getByText("Alpha Mission")).toBeInTheDocument();
		expect(screen.getByText("Beta Mission")).toBeInTheDocument();
	});

	it("shows mission status badges", () => {
		render(<MissionList {...defaultProps} />);
		expect(screen.getByText("active")).toBeInTheDocument();
		expect(screen.getByText("completed")).toBeInTheDocument();
	});

	it("navigates to mission page when clicked", () => {
		render(<MissionList {...defaultProps} />);
		const link = screen.getByRole("link", { name: /alpha mission/i });
		expect(link).toHaveAttribute("href", "/missions/m1");
	});

	it("applies active styling to selected mission", () => {
		const props = { ...defaultProps, activeMissionId: "m1" };
		render(<MissionList {...props} />);
		const activeLink = screen.getByRole("link", { name: /alpha mission/i });
		expect(activeLink.closest("div")).toHaveClass("border-primary/60");
	});

	it("shows loading skeletons when loading", () => {
		const props = { ...defaultProps, loadingMissions: true };
		const { container } = render(<MissionList {...props} />);
		const skeletons = container.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThanOrEqual(2);
	});

	it("shows empty state when no missions", () => {
		const props = { ...defaultProps, missions: [] };
		render(<MissionList {...props} />);
		expect(screen.getByText("No missions yet.")).toBeInTheDocument();
	});

	it("renders collapsed state correctly", () => {
		const props = { ...defaultProps, sidebarCollapsed: true };
		render(<MissionList {...props} />);
		// Should show initials instead of full names
		expect(screen.queryByText("Alpha Mission")).not.toBeInTheDocument();
	});

	it("shows delete button when onDeleteMission is provided and not collapsed", () => {
		const onDeleteMission = () => {};
		const props = {
			...defaultProps,
			onDeleteMission,
		};
		render(<MissionList {...props} />);
		expect(
			screen.getByRole("button", { name: /delete alpha mission/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /delete beta mission/i }),
		).toBeInTheDocument();
	});

	it("hides delete button when sidebar is collapsed", () => {
		const onDeleteMission = () => {};
		const props = {
			...defaultProps,
			sidebarCollapsed: true,
			onDeleteMission,
		};
		render(<MissionList {...props} />);
		expect(
			screen.queryByRole("button", { name: /delete/i }),
		).not.toBeInTheDocument();
	});
});
