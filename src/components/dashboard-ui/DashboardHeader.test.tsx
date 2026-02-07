import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mission } from "@/core/schemas/mission";
import { DashboardHeader } from "./DashboardHeader";

vi.mock("@/components/ThemeToggle", () => ({
	ThemeToggle: () => (
		<button type="button" data-testid="theme-toggle">
			Theme
		</button>
	),
}));

vi.mock("./SnapshotDropdown", () => ({
	SnapshotDropdown: ({ mission }: { mission: Mission | null }) => (
		<div data-testid="snapshot-dropdown">
			{mission ? "Snapshot Menu" : "No Mission"}
		</div>
	),
}));

describe("DashboardHeader", () => {
	const mockMission: Mission = {
		schemaVersion: 1,
		id: "mission-1",
		name: "Test Mission",
		status: "active",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const defaultProps = {
		mission: null as Mission | null,
		roadmap: "# Test Roadmap",
		loadingMission: false,
		onRoadmapSave: vi.fn(),
		savingRoadmap: false,
	};

	afterEach(() => {
		cleanup();
	});

	it("shows placeholder when no mission is selected", () => {
		render(<DashboardHeader {...defaultProps} />);
		expect(screen.getByText("Select a mission")).toBeInTheDocument();
	});

	it("renders mission name when mission is provided", () => {
		const props = { ...defaultProps, mission: mockMission };
		render(<DashboardHeader {...props} />);
		expect(
			screen.getByRole("heading", { name: /test mission/i }),
		).toBeInTheDocument();
	});

	it("shows active status badge", () => {
		const props = { ...defaultProps, mission: mockMission };
		render(<DashboardHeader {...props} />);
		expect(screen.getByText("active")).toBeInTheDocument();
	});

	it("shows paused status badge", () => {
		const props = {
			...defaultProps,
			mission: { ...mockMission, status: "paused" as const },
		};
		render(<DashboardHeader {...props} />);
		expect(screen.getByText("paused")).toBeInTheDocument();
	});

	it("shows completed status badge", () => {
		const props = {
			...defaultProps,
			mission: { ...mockMission, status: "completed" as const },
		};
		render(<DashboardHeader {...props} />);
		expect(screen.getByText("completed")).toBeInTheDocument();
	});

	it("shows archived status badge", () => {
		const props = {
			...defaultProps,
			mission: { ...mockMission, status: "archived" as const },
		};
		render(<DashboardHeader {...props} />);
		expect(screen.getByText("archived")).toBeInTheDocument();
	});

	it("shows helper text when no mission selected", () => {
		render(<DashboardHeader {...defaultProps} />);
		expect(screen.getByText(/pick a mission/i)).toBeInTheDocument();
	});

	it("hides helper text when mission is selected", () => {
		const props = { ...defaultProps, mission: mockMission };
		render(<DashboardHeader {...props} />);
		expect(screen.queryByText(/pick a mission/i)).not.toBeInTheDocument();
	});

	it("renders theme toggle", () => {
		render(<DashboardHeader {...defaultProps} />);
		expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
	});

	it("renders snapshot dropdown", () => {
		const props = { ...defaultProps, mission: mockMission };
		render(<DashboardHeader {...props} />);
		expect(screen.getByTestId("snapshot-dropdown")).toBeInTheDocument();
	});

	it("renders Mission Overview label", () => {
		render(<DashboardHeader {...defaultProps} />);
		expect(screen.getByText("Mission Overview")).toBeInTheDocument();
	});
});
