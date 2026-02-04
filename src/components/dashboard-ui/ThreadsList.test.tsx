import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ThreadFile } from "@/core/schemas";
import { ThreadsList } from "./ThreadsList";

describe("ThreadsList", () => {
	const mockThreads: ThreadFile[] = [
		{
			schemaVersion: 1,
			taskId: "t1",
			title: "API Design Discussion",
			creatorAgentId: "manager-1",
			status: "open",
			messages: [
				{
					id: "msg1",
					createdAt: new Date().toISOString(),
					authorAgentId: "manager-1",
					mentionsAgentId: "agent-1",
					content: "Let's discuss the API design.",
					resolved: false,
				},
			],
		},
		{
			schemaVersion: 1,
			taskId: "t2",
			title: "Bug Fix Confirmation",
			creatorAgentId: "agent-1",
			status: "resolved",
			messages: [
				{
					id: "msg2",
					createdAt: new Date().toISOString(),
					authorAgentId: "agent-1",
					mentionsAgentId: "manager-1",
					content: "Bug is fixed.",
					resolved: true,
					resolvedAt: new Date().toISOString(),
					resolvedByAgentId: "manager-1",
				},
			],
		},
	];

	const mockAgentMap = new Map<string, string>([
		["manager-1", "Manager"],
		["agent-1", "Alice"],
	]);

	const defaultProps = {
		threads: mockThreads,
		agentMap: mockAgentMap,
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
		expect(screen.getByText("by Manager")).toBeInTheDocument();
		expect(screen.getByText("by Alice")).toBeInTheDocument();
	});

	it("shows open status badge", () => {
		render(<ThreadsList {...defaultProps} />);
		const openBadge = screen.getByText("open");
		expect(openBadge).toBeInTheDocument();
		// Open should have emerald styling
		expect(openBadge).toHaveClass("border-emerald-500/40");
	});

	it("shows resolved status badge", () => {
		render(<ThreadsList {...defaultProps} />);
		const resolvedBadge = screen.getByText("resolved");
		expect(resolvedBadge).toBeInTheDocument();
		// Resolved should have muted styling
		expect(resolvedBadge.closest("a")).toHaveClass("border-border/70");
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
		const threadsWithUnknownCreator: ThreadFile[] = [
			{
				schemaVersion: 1,
				taskId: "t1",
				title: "Unknown Creator",
				creatorAgentId: "unknown-agent",
				status: "open",
				messages: [],
			},
		];
		const props = { ...defaultProps, threads: threadsWithUnknownCreator };
		render(<ThreadsList {...props} />);
		expect(screen.getByText("by unknown-agent")).toBeInTheDocument();
	});
});
