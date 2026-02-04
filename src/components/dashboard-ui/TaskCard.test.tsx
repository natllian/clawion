import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskItem } from "@/core/schemas/tasks";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

vi.mock("lucide-react", async () => {
	const actual = await vi.importActual("lucide-react");
	return {
		...actual,
		MessageSquare: () => <svg data-testid="message-square" />,
	};
});

// Dynamic import to ensure mocks are applied
const { TaskCard } = await import("./TaskCard");

describe("TaskCard", () => {
	const mockTask: TaskItem = {
		id: "1",
		title: "Test Task",
		description: "Test description",
		columnId: "col-1",
		statusNotes: "",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const defaultProps = {
		task: mockTask,
		activeTaskId: null as string | null,
		activeMissionId: null as string | null,
		agentMap: new Map<string, string>(),
		onTaskSelect: vi.fn(),
	};

	afterEach(() => {
		cleanup();
	});

	it("renders task title", () => {
		render(<TaskCard {...defaultProps} />);
		expect(screen.getByText("Test Task")).toBeInTheDocument();
	});

	it("renders task description", () => {
		render(<TaskCard {...defaultProps} />);
		expect(screen.getByText("Test description")).toBeInTheDocument();
	});

	it("renders markdown in task description", () => {
		const props = {
			...defaultProps,
			task: { ...mockTask, description: "Hello **world**" },
		};
		render(<TaskCard {...props} />);
		expect(screen.getByText("world").tagName.toLowerCase()).toBe("strong");
	});

	it("renders task ID badge", () => {
		render(<TaskCard {...defaultProps} />);
		expect(screen.getByText("#1")).toBeInTheDocument();
	});

	it("shows Unassigned when no assignee", () => {
		render(<TaskCard {...defaultProps} />);
		expect(screen.getByText("Unassigned")).toBeInTheDocument();
	});

	it("shows assignee name when assigned", () => {
		const props = {
			...defaultProps,
			task: { ...mockTask, assigneeAgentId: "agent-1" },
			agentMap: new Map([["agent-1", "alice"]]),
		};
		render(<TaskCard {...props} />);
		expect(screen.getByText("@alice")).toBeInTheDocument();
	});

	it("calls onTaskSelect when clicked", () => {
		render(<TaskCard {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: /test task/i }));
		expect(defaultProps.onTaskSelect).toHaveBeenCalledWith("1");
	});

	it("applies active styling when selected", () => {
		const props = { ...defaultProps, activeTaskId: "1" };
		render(<TaskCard {...props} />);
		const card = screen
			.getByRole("button", { name: /test task/i })
			.closest("div");
		expect(card).not.toBeNull();
		expect(card).toHaveClass("bg-primary/10");
	});

	it("does not apply active styling when not selected", () => {
		render(<TaskCard {...defaultProps} />);
		const card = screen
			.getByRole("button", { name: /test task/i })
			.closest("div");
		expect(card).not.toBeNull();
		expect(card).not.toHaveClass("bg-primary/10");
	});

	it("shows Blocked badge when statusNotes starts with blocked:", () => {
		const props = {
			...defaultProps,
			task: { ...mockTask, statusNotes: "blocked: waiting for API" },
		};
		render(<TaskCard {...props} />);
		expect(screen.getByText("Blocked")).toBeInTheDocument();
	});

	it("shows statusNotes when present", () => {
		const props = {
			...defaultProps,
			task: { ...mockTask, statusNotes: "Needs review" },
		};
		render(<TaskCard {...props} />);
		expect(screen.getByText("Needs review")).toBeInTheDocument();
	});
});
