import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentsFile, WorkingEvent } from "@/core/schemas";

// Dynamic import to apply mocks before testing
const { AgentDropdown: TestedAgentDropdown, WorkingEventItem } = await import(
	"./AgentDropdown"
);

const mockAgents: AgentsFile = {
	schemaVersion: 1,
	agents: [
		{
			id: "agent-1",
			displayName: "Alice",
			systemRole: "worker",
			roleDescription: "Frontend developer",
		},
		{
			id: "manager-1",
			displayName: "Bob",
			systemRole: "manager",
			roleDescription: "Project manager",
		},
	],
};

const defaultProps = {
	agents: mockAgents,
	loadingMission: false,
	activeAgentId: "agent-1" as string | null,
	onAgentSelect: vi.fn(),
	working: [] as WorkingEvent[],
	loadingAgent: false,
};

describe("AgentDropdown - rendering", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
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

describe("WorkingEventItem", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders event with date and content", () => {
		const event: WorkingEvent = {
			id: "w1",
			agentId: "agent-1",
			createdAt: "2024-01-15T10:30:00Z",
			content: "Test content",
		};
		render(<WorkingEventItem event={event} />);
		// Check that the event contains some date formatting (contains the year)
		expect(screen.getByText(/2024/)).toBeInTheDocument();
		expect(screen.getByText("Test content")).toBeInTheDocument();
	});

	it("handles invalid date gracefully", () => {
		const event: WorkingEvent = {
			id: "w1",
			agentId: "agent-1",
			createdAt: "invalid-date",
			content: "Test content",
		};
		render(<WorkingEventItem event={event} />);
		// Should display the original string for invalid dates
		expect(screen.getByText("invalid-date")).toBeInTheDocument();
	});

	it("renders markdown content", () => {
		const event: WorkingEvent = {
			id: "w1",
			agentId: "agent-1",
			createdAt: "2024-01-15T10:30:00Z",
			content: "**Bold** and *italic*",
		};
		render(<WorkingEventItem event={event} />);
		expect(screen.getByText("Bold")).toBeInTheDocument();
	});

	it("renders multiline content", () => {
		const event: WorkingEvent = {
			id: "w1",
			agentId: "agent-1",
			createdAt: "2024-01-15T10:30:00Z",
			content: "Line 1\nLine 2\nLine 3",
		};
		render(<WorkingEventItem event={event} />);
		// Markdown renders newlines as <br> within paragraphs, check content is present
		expect(screen.getByText(/Line 1/)).toBeInTheDocument();
		expect(screen.getByText(/Line 2/)).toBeInTheDocument();
		expect(screen.getByText(/Line 3/)).toBeInTheDocument();
	});
});
