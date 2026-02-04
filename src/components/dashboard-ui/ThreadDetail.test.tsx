import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mission, ThreadFile } from "@/core/schemas";

// Define ThreadResponse inline since it's not exported
interface ThreadResponse {
	thread: ThreadFile;
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

const mockThread: ThreadFile = {
	schemaVersion: 1,
	taskId: "t1",
	title: "Test Thread",
	creatorAgentId: "agent-1",
	status: "open",
	messages: [
		{
			id: "msg-1",
			createdAt: "2024-01-01T10:00:00Z",
			authorAgentId: "agent-1",
			mentionsAgentId: "manager-1",
			content: "Hello, this is a test message.",
			resolved: false,
		},
		{
			id: "msg-2",
			createdAt: "2024-01-01T11:00:00Z",
			authorAgentId: "manager-1",
			mentionsAgentId: "agent-1",
			content: "Reply message.",
			resolved: true,
			resolvedAt: "2024-01-01T12:00:00Z",
			resolvedByAgentId: "manager-1",
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
});
