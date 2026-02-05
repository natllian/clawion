import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskItem, TasksFile, ThreadSummary } from "@/core/schemas";
import { TaskBoardSection } from "./TaskBoard";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

// Dynamic import to ensure mocks are applied
const { TaskColumn } = await import("./TaskColumn");

describe("TaskBoardSection", () => {
	const mockTasks: TaskItem[] = [
		{
			id: "t1",
			title: "Task 1",
			description: "First task",
			columnId: "todo",
			statusNotes: "",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	];

	const mockTasksFile: TasksFile = {
		schemaVersion: 1,
		description: "Test tasks",
		columns: [
			{ id: "todo", name: "To Do", order: 1 },
			{ id: "done", name: "Done", order: 2 },
		],
		tasks: mockTasks,
	};

	const mockAgentMap = new Map<string, string>([["agent-1", "Alice"]]);

	const defaultProps = {
		loadingMission: false,
		tasksColumns: mockTasksFile.columns,
		tasksFile: mockTasksFile,
		threads: [] as ThreadSummary[],
		activeTaskId: null as string | null,
		activeMissionId: "m1",
		agentMap: mockAgentMap,
		onTaskSelect: vi.fn(),
	};

	afterEach(() => {
		cleanup();
	});

	it("renders children content", () => {
		render(
			<TaskBoardSection {...defaultProps}>
				<div data-testid="children">Child Content</div>
			</TaskBoardSection>,
		);
		expect(screen.getByTestId("children")).toBeInTheDocument();
	});

	it("shows loading skeletons when loading", () => {
		const props = { ...defaultProps, loadingMission: true };
		const { container } = render(
			<TaskBoardSection {...props}>
				<div>Content</div>
			</TaskBoardSection>,
		);
		const skeletons = container.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThanOrEqual(2);
	});

	it("shows empty state when no columns", () => {
		const props = {
			...defaultProps,
			tasksColumns: [],
			tasksFile: { ...mockTasksFile, columns: [], tasks: [] },
		};
		render(
			<TaskBoardSection {...props}>
				<div>Content</div>
			</TaskBoardSection>,
		);
		expect(
			screen.getByText("No tasks yet. Create them via CLI."),
		).toBeInTheDocument();
	});

	it("renders agents label and task columns", () => {
		const { container } = render(
			<TaskBoardSection {...defaultProps}>
				<div>Content</div>
			</TaskBoardSection>,
		);
		expect(container.textContent).toContain("Agents");
		expect(container.textContent).toContain("To Do");
		expect(container.textContent).toContain("Done");
	});
});

describe("TaskColumn", () => {
	const mockColumn = { id: "todo", name: "To Do", order: 1 };
	const mockTasks: TaskItem[] = [
		{
			id: "t1",
			title: "Test Task",
			description: "Description",
			columnId: "todo",
			statusNotes: "",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	];

	const defaultProps = {
		column: mockColumn,
		tasks: mockTasks,
		activeTaskId: null as string | null,
		activeMissionId: "m1",
		agentMap: new Map<string, string>(),
		threadTaskIds: new Set<string>(),
		onTaskSelect: vi.fn(),
	};

	afterEach(() => {
		cleanup();
	});

	it("renders column name", () => {
		render(<TaskColumn {...defaultProps} />);
		expect(screen.getByText("To Do")).toBeInTheDocument();
	});

	it("renders task title", () => {
		render(<TaskColumn {...defaultProps} />);
		expect(screen.getByText("Test Task")).toBeInTheDocument();
	});

	it("calls onTaskSelect when task is clicked", () => {
		const onSelect = vi.fn();
		render(<TaskColumn {...defaultProps} onTaskSelect={onSelect} />);
		fireEvent.click(
			screen.getByRole("button", { name: /select task: test task/i }),
		);
		expect(onSelect).toHaveBeenCalledWith("t1");
	});
});
