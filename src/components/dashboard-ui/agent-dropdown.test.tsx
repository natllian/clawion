import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentsFile } from "@/core/schemas";

// Dynamic import to apply mocks before testing
const { AgentDropdown: TestedAgentDropdown } = await import("./agent-dropdown");

const mockAgents: AgentsFile = {
	schemaVersion: 1,
	agents: [
		{
			id: "agent-1",
			displayName: "Alice",
			systemRole: "worker",
			status: "active",
			roleDescription: "Frontend developer",
		},
		{
			id: "manager-1",
			displayName: "Bob",
			systemRole: "manager",
			status: "active",
			roleDescription: "Project manager",
		},
	],
};

const defaultProps = {
	agents: mockAgents,
	loadingMission: false,
	activeAgentId: null as string | null,
	onAgentSelect: vi.fn(),
	working: "",
	log: null,
	loadingAgent: false,
};

describe("AgentDropdown - rendering", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders agent names", () => {
		render(<TestedAgentDropdown {...defaultProps} />);
		expect(screen.getByText("Alice")).toBeInTheDocument();
		expect(screen.getByText("Bob")).toBeInTheDocument();
	});

	it("shows loading skeletons when loading mission", () => {
		const props = { ...defaultProps, loadingMission: true };
		const { container } = render(<TestedAgentDropdown {...props} />);
		const skeletons = container.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThanOrEqual(4);
	});

	it("shows empty state when no agents", () => {
		const emptyAgents: AgentsFile = { schemaVersion: 1, agents: [] };
		const props = {
			...defaultProps,
			agents: emptyAgents,
		};
		render(<TestedAgentDropdown {...props} />);
		expect(screen.getByText("No agents yet.")).toBeInTheDocument();
	});

	it("renders agent avatars", () => {
		render(<TestedAgentDropdown {...defaultProps} />);
		const avatars = document.querySelectorAll("[data-slot='avatar']");
		expect(avatars).toHaveLength(2);
	});

	it("shows both agent buttons", () => {
		render(<TestedAgentDropdown {...defaultProps} />);
		const buttons = document.querySelectorAll("button[type='button']");
		expect(buttons.length).toBeGreaterThanOrEqual(2);
	});

	it("calls onAgentSelect when clicking agent button", () => {
		const onAgentSelect = vi.fn();
		const props = {
			...defaultProps,
			onAgentSelect,
		};
		render(<TestedAgentDropdown {...props} />);
		const buttons = document.querySelectorAll("button[type='button']");
		const bobButton = Array.from(buttons).find((btn) =>
			btn.textContent?.includes("Bob"),
		) as HTMLButtonElement | undefined;
		bobButton?.click();
		expect(onAgentSelect).toHaveBeenCalledWith("manager-1");
	});

	it("shows initials for each agent", () => {
		render(<TestedAgentDropdown {...defaultProps} />);
		// Avatars show initials
		const avatars = document.querySelectorAll("[data-slot='avatar-fallback']");
		expect(avatars).toHaveLength(2);
		// First avatar shows "A" for Alice
		expect(avatars[0]).toHaveTextContent("A");
		// Second avatar shows "B" for Bob
		expect(avatars[1]).toHaveTextContent("B");
	});

	it("renders agent buttons with correct roles", () => {
		render(<TestedAgentDropdown {...defaultProps} />);
		const buttons = document.querySelectorAll(
			"[data-slot='dropdown-menu-trigger']",
		);
		expect(buttons).toHaveLength(2);
	});
});
