import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadDetail as ThreadDetailData } from "@/core/schemas";

// Define ThreadResponse inline since it's not exported
interface ThreadResponse {
	thread: ThreadDetailData;
	pendingAckByMessageId?: Record<string, string[]>;
	task: {
		id: string;
		title: string;
		description: string;
		columnId: string;
		assigneeAgentId: string | null;
		statusNotes: string | null;
		createdAt: string;
		updatedAt: string;
	};
	column: {
		id: string;
		name: string;
	} | null;
}

// Mock Next.js router
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(() => ({
		push: pushMock,
		replace: vi.fn(),
		refresh: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		prefetch: vi.fn(),
	})),
}));

// Mock fetch
global.fetch = vi.fn();

const mockThread: ThreadDetailData = {
	taskId: "t1",
	messages: [
		{
			type: "message",
			id: "msg-1",
			createdAt: "2024-01-01T10:00:00Z",
			authorAgentId: "agent-1",
			mentionsAgentIds: ["manager-1"],
			content: "Hello, this is a test message.",
		},
		{
			type: "message",
			id: "msg-2",
			createdAt: "2024-01-01T11:00:00Z",
			authorAgentId: "manager-1",
			mentionsAgentIds: ["agent-1", "agent-2"],
			content: "Reply message.",
		},
	],
};

const mockThreadResponse: ThreadResponse = {
	thread: mockThread,
	task: {
		id: "t1",
		title: "Task Title",
		description: "Task description",
		columnId: "todo",
		assigneeAgentId: "agent-1",
		statusNotes: null,
		createdAt: "2024-01-01T09:00:00Z",
		updatedAt: "2024-01-01T12:00:00Z",
	},
	column: {
		id: "todo",
		name: "To Do",
	},
};

const agentMap = new Map([
	["agent-1", "Alice"],
	["manager-1", "Bob"],
]);

// Dynamic import to apply mocks before testing
const { ThreadDetail } = await import("./ThreadDetail");

describe("ThreadDetail", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
		pushMock.mockReset();
	});

	it("shows skeleton while loading", () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {}), // Never resolve
		);

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		// Should show skeleton elements
		const skeletons = document.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("shows not found when thread does not exist", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 404,
		});

		render(
			<ThreadDetail missionId="m1" threadId="missing" agentMap={agentMap} />,
		);

		await waitFor(() => {
			expect(screen.getByText("Thread not found")).toBeInTheDocument();
		});
	});

	it("renders thread content when loaded", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("Task Title")).toBeInTheDocument();
		});
	});

	it("displays task information", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("Task description")).toBeInTheDocument();
			expect(screen.getByText("To Do")).toBeInTheDocument();
		});
	});

	it("shows back button", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("Back to board")).toBeInTheDocument();
		});
	});

	it("navigates back to board when back button is clicked", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);
		await waitFor(() => {
			expect(screen.getByText("Task Title")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: "Back to board" }));
		expect(pushMock).toHaveBeenCalledWith("/missions/m1");
	});

	it("shows thread title and messages", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("2 messages")).toBeInTheDocument();
		});
	});

	it("renders task description as markdown", async () => {
		const payload: ThreadResponse = {
			...mockThreadResponse,
			task: {
				...mockThreadResponse.task,
				description: "Overview\\n\\n### Budget",
			},
		};

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => payload,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
				"Budget",
			);
		});
	});

	it("shows acknowledgment state for each message", async () => {
		const payload: ThreadResponse = {
			...mockThreadResponse,
			pendingAckByMessageId: {
				"msg-1": ["agent-1"],
			},
		};

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => payload,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("Awaiting ack: @Alice")).toBeInTheDocument();
		});
		expect(screen.getByText("Acknowledged")).toBeInTheDocument();
	});

	it("acknowledges all pending mentions from thread detail", async () => {
		const pendingPayload: ThreadResponse = {
			...mockThreadResponse,
			pendingAckByMessageId: {
				"msg-1": ["agent-1", "agent-2"],
			},
		};
		const refreshedPayload: ThreadResponse = {
			...mockThreadResponse,
			pendingAckByMessageId: {},
		};

		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => pendingPayload,
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ ok: true, ackedCount: 2 }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => refreshedPayload,
			});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "All acknowledged" }),
			).toBeEnabled();
		});

		fireEvent.click(screen.getByRole("button", { name: "All acknowledged" }));

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Acknowledged" }),
			).toBeDisabled();
		});
		expect(global.fetch).toHaveBeenCalledWith(
			"/api/missions/m1/threads/t1/ack-all",
			{
				method: "POST",
			},
		);
	});

	it("handles acknowledge-all API failure without crashing", async () => {
		const pendingPayload: ThreadResponse = {
			...mockThreadResponse,
			pendingAckByMessageId: {
				"msg-1": ["agent-1"],
			},
		};

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => pendingPayload,
			})
			.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: "ack failed" }),
			});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "All acknowledged" }),
			).toBeEnabled();
		});
		fireEvent.click(screen.getByRole("button", { name: "All acknowledged" }));

		await waitFor(() => {
			expect(errorSpy).toHaveBeenCalled();
		});
		expect(
			screen.getByRole("button", { name: "All acknowledged" }),
		).toBeEnabled();
	});

	it("opens agent snapshot when clicking avatar", async () => {
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockThreadResponse,
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ agentId: "agent-1", events: [] }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ agentId: "agent-1", content: "" }),
			});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("Task Title")).toBeInTheDocument();
		});

		fireEvent.pointerDown(
			screen.getByRole("button", { name: /open snapshot for alice/i }),
			{ button: 0, ctrlKey: false },
		);
		await waitFor(() => {
			expect(screen.getByText("Agent Profile")).toBeInTheDocument();
		});
	});

	it("opens agent snapshot when clicking assignee badge", async () => {
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockThreadResponse,
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ agentId: "agent-1", events: [] }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ agentId: "agent-1", content: "" }),
			});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("Task Title")).toBeInTheDocument();
		});

		fireEvent.pointerDown(screen.getByRole("button", { name: "@Alice" }), {
			button: 0,
			ctrlKey: false,
		});
		await waitFor(() => {
			expect(screen.getByText("Agent Profile")).toBeInTheDocument();
		});
	});

	it("completes task from thread detail without ack gating", async () => {
		const completedPayload: ThreadResponse = {
			...mockThreadResponse,
			task: {
				...mockThreadResponse.task,
				columnId: "completed",
			},
			column: {
				id: "completed",
				name: "Completed",
			},
		};

		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockThreadResponse,
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ ok: true }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => completedPayload,
			});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("Task Title")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: "Complete task" }));

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Completed" })).toBeDisabled();
		});
		expect(global.fetch).toHaveBeenCalledWith(
			"/api/missions/m1/tasks/t1/complete",
			{
				method: "POST",
			},
		);
	});

	it("shows blocked badge when statusNotes starts with blocked:", async () => {
		const blockedPayload: ThreadResponse = {
			...mockThreadResponse,
			task: {
				...mockThreadResponse.task,
				statusNotes: "blocked: waiting for API",
			},
		};

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => blockedPayload,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("Blocked")).toBeInTheDocument();
		});
		expect(screen.getByText("blocked: waiting for API")).toBeInTheDocument();
	});

	it("renders ongoing column badge with blue styling", async () => {
		const ongoingPayload: ThreadResponse = {
			...mockThreadResponse,
			task: { ...mockThreadResponse.task, columnId: "ongoing" },
			column: { id: "ongoing", name: "In Progress" },
		};

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => ongoingPayload,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			const badge = screen.getByText("In Progress");
			expect(badge).toBeInTheDocument();
		});
	});

	it("shows Unassigned when no assignee", async () => {
		const unassignedPayload: ThreadResponse = {
			...mockThreadResponse,
			task: {
				...mockThreadResponse.task,
				assigneeAgentId: null,
			},
		};

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => unassignedPayload,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			const unassignedElements = screen.getAllByText("Unassigned");
			expect(unassignedElements.length).toBeGreaterThanOrEqual(1);
		});
	});

	it("shows empty thread messages state", async () => {
		const emptyPayload: ThreadResponse = {
			...mockThreadResponse,
			thread: { taskId: "t1", messages: [] },
		};

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => emptyPayload,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("No thread messages yet.")).toBeInTheDocument();
		});
		expect(screen.getByText("0 messages")).toBeInTheDocument();
	});

	it("shows participants card", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("Participants")).toBeInTheDocument();
		});
	});

	it("renders column name from column when available", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("To Do")).toBeInTheDocument();
		});
	});

	it("falls back to columnId when column is null", async () => {
		const noColumnPayload: ThreadResponse = {
			...mockThreadResponse,
			column: null,
		};

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => noColumnPayload,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("todo")).toBeInTheDocument();
		});
	});

	it("shows message content and mentions", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(
				screen.getByText("Hello, this is a test message."),
			).toBeInTheDocument();
			expect(screen.getByText("Reply message.")).toBeInTheDocument();
		});
		// Check mention labels
		expect(screen.getByText("to @Bob")).toBeInTheDocument();
	});

	it("handles complete task failure gracefully", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockThreadResponse,
			})
			.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: "Cannot complete" }),
			});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("Task Title")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: "Complete task" }));

		await waitFor(() => {
			// Button should return to "Complete task" after failure
			expect(
				screen.getByRole("button", { name: "Complete task" }),
			).toBeInTheDocument();
		});

		consoleSpy.mockRestore();
	});

	it("renders completed column badge tone", async () => {
		const completedPayload: ThreadResponse = {
			...mockThreadResponse,
			task: { ...mockThreadResponse.task, columnId: "done" },
			column: { id: "done", name: "Done" },
		};

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => completedPayload,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			const badge = screen.getByText("Done");
			expect(badge).toHaveClass("tone-success-soft");
		});
	});

	it("shows Created and Updated dates", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText(/Created/)).toBeInTheDocument();
			expect(screen.getByText(/Updated/)).toBeInTheDocument();
		});
	});

	it("renders Assignee card with agent name", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("Assignee")).toBeInTheDocument();
		});
	});

	it("shows No participants yet when empty thread", async () => {
		const emptyPayload: ThreadResponse = {
			...mockThreadResponse,
			thread: { taskId: "t1", messages: [] },
		};

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => emptyPayload,
		});

		render(<ThreadDetail missionId="m1" threadId="t1" agentMap={agentMap} />);

		await waitFor(() => {
			expect(screen.getByText("No participants yet.")).toBeInTheDocument();
		});
	});
});
