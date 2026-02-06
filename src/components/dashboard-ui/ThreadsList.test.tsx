import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type ThreadListItem, ThreadsList } from "./ThreadsList";

describe("ThreadsList", () => {
	const mockThreads: ThreadListItem[] = [
		{
			taskId: "t1",
			messageCount: 1,
			lastMessageAt: new Date().toISOString(),
			lastAuthorAgentId: "manager-1",
			lastMentionsAgentIds: ["agent-1"],
			unackedMentionCount: 1,
			pendingAckAgentIds: ["agent-1"],
		},
		{
			taskId: "t2",
			messageCount: 2,
			lastMessageAt: new Date().toISOString(),
			lastAuthorAgentId: "agent-1",
			lastMentionsAgentIds: ["manager-1"],
			unackedMentionCount: 0,
			pendingAckAgentIds: [],
		},
	];

	const mockAgentMap = new Map<string, string>([
		["manager-1", "Manager"],
		["agent-1", "Alice"],
	]);
	const mockTaskMap = new Map<string, string>([
		["t1", "API Design Discussion"],
		["t2", "Bug Fix Confirmation"],
	]);

	const defaultProps = {
		threads: mockThreads,
		agentMap: mockAgentMap,
		taskMap: mockTaskMap,
		loadingMission: false,
		activeMissionId: "m1",
	};

	afterEach(() => {
		cleanup();
	});

	it("renders thread titles", () => {
		render(<ThreadsList {...defaultProps} />);
		expect(screen.getByText("API Design Discussion")).toBeInTheDocument();
		expect(screen.getByText("Bug Fix Confirmation")).toBeInTheDocument();
	});

	it("shows creator names", () => {
		render(<ThreadsList {...defaultProps} />);
		expect(screen.getByText(/by Manager/)).toBeInTheDocument();
		expect(screen.getByText(/by Alice/)).toBeInTheDocument();
	});

	it("shows acknowledgment state", () => {
		render(<ThreadsList {...defaultProps} />);
		expect(screen.getByText(/Ack pending: 1/)).toBeInTheDocument();
		expect(screen.getByText(/@Alice/)).toBeInTheDocument();
		expect(screen.getByText("All acknowledged")).toBeInTheDocument();
	});

	it("shows loading skeletons when loading", () => {
		const props = { ...defaultProps, loadingMission: true };
		const { container } = render(<ThreadsList {...props} />);
		const skeletons = container.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThanOrEqual(3);
	});

	it("shows empty state when no threads", () => {
		const props = { ...defaultProps, threads: [] };
		render(<ThreadsList {...props} />);
		expect(screen.getByText("No threads yet.")).toBeInTheDocument();
	});

	it("links to thread page", () => {
		render(<ThreadsList {...defaultProps} />);
		const link = screen.getByRole("link", { name: /api design discussion/i });
		expect(link).toHaveAttribute("href", "/missions/m1/threads/t1");
	});

	it("shows unknown creator when agent not in map", () => {
		const threadsWithUnknownCreator: ThreadListItem[] = [
			{
				taskId: "t1",
				messageCount: 0,
				lastMessageAt: undefined,
				lastAuthorAgentId: "unknown-agent",
				lastMentionsAgentIds: [],
				unackedMentionCount: 0,
				pendingAckAgentIds: [],
			},
		];
		const props = { ...defaultProps, threads: threadsWithUnknownCreator };
		render(<ThreadsList {...props} />);
		expect(screen.getByText(/by unknown-agent/)).toBeInTheDocument();
	});
});
