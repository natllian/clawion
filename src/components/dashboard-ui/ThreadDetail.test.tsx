import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mission, ThreadDetail as ThreadDetailData } from "@/core/schemas";

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
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		replace: vi.fn(),
		refresh: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		prefetch: vi.fn(),
	})),
}));

// Mock fetch
global.fetch = vi.fn();

const mockMission: Mission = {
	schemaVersion: 1,
	id: "m1",
	name: "Test Mission",
	description: "A test mission",
	status: "active",
	createdAt: "2024-01-01T08:00:00Z",
	updatedAt: "2024-01-01T12:00:00Z",
};

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
	});

	it("shows skeleton while loading", () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {}), // Never resolve
		);

		render(
			<ThreadDetail
				missionId="m1"
				threadId="t1"
				mission={mockMission}
				agentMap={agentMap}
			/>,
		);

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
			<ThreadDetail
				missionId="m1"
				threadId="missing"
				mission={mockMission}
				agentMap={agentMap}
			/>,
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

		render(
			<ThreadDetail
				missionId="m1"
				threadId="t1"
				mission={mockMission}
				agentMap={agentMap}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("Task Title")).toBeInTheDocument();
		});
	});

	it("displays task information", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(
			<ThreadDetail
				missionId="m1"
				threadId="t1"
				mission={mockMission}
				agentMap={agentMap}
			/>,
		);

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

		render(
			<ThreadDetail
				missionId="m1"
				threadId="t1"
				mission={mockMission}
				agentMap={agentMap}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("Back to board")).toBeInTheDocument();
		});
	});

	it("shows thread title and messages", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: async () => mockThreadResponse,
		});

		render(
			<ThreadDetail
				missionId="m1"
				threadId="t1"
				mission={mockMission}
				agentMap={agentMap}
			/>,
		);

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

		render(
			<ThreadDetail
				missionId="m1"
				threadId="t1"
				mission={mockMission}
				agentMap={agentMap}
			/>,
		);

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

		render(
			<ThreadDetail
				missionId="m1"
				threadId="t1"
				mission={mockMission}
				agentMap={agentMap}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("Awaiting ack: @Alice")).toBeInTheDocument();
		});
		expect(screen.getByText("Acknowledged")).toBeInTheDocument();
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

		render(
			<ThreadDetail
				missionId="m1"
				threadId="t1"
				mission={mockMission}
				agentMap={agentMap}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("Task Title")).toBeInTheDocument();
		});

		fireEvent.pointerDown(
			screen.getByRole("button", { name: /open snapshot for alice/i }),
			{ button: 0, ctrlKey: false },
		);
		await waitFor(() => {
			expect(screen.getByText("Agent Snapshot")).toBeInTheDocument();
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

		render(
			<ThreadDetail
				missionId="m1"
				threadId="t1"
				mission={mockMission}
				agentMap={agentMap}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("Task Title")).toBeInTheDocument();
		});

		fireEvent.pointerDown(screen.getByRole("button", { name: "@Alice" }), {
			button: 0,
			ctrlKey: false,
		});
		await waitFor(() => {
			expect(screen.getByText("Agent Snapshot")).toBeInTheDocument();
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

		render(
			<ThreadDetail
				missionId="m1"
				threadId="t1"
				mission={mockMission}
				agentMap={agentMap}
			/>,
		);

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
});
