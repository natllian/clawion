import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mission, MissionIndexItem, TasksFile } from "@/core/schemas";

// Mock all child components to isolate Dashboard logic
vi.mock("./index", () => ({
	AgentDropdown: () => <div data-testid="agent-dropdown">AgentDropdown</div>,
	DashboardHeader: ({ mission }: { mission: Mission | null }) => (
		<div data-testid="dashboard-header">
			{mission ? mission.name : "No mission"}
		</div>
	),
	ErrorBanner: ({ error }: { error: string | null }) =>
		error ? <div data-testid="error-banner">{error}</div> : null,
	MissionList: ({
		missions,
		loadingMissions,
	}: {
		missions: MissionIndexItem[];
		loadingMissions: boolean;
	}) => (
		<div data-testid="mission-list">
			{loadingMissions
				? "Loading..."
				: missions.map((m) => <span key={m.id}>{m.name}</span>)}
		</div>
	),
	Sidebar: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sidebar">{children}</div>
	),
	TaskBoardSection: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="task-board">{children}</div>
	),
	ThreadDetail: () => <div data-testid="thread-detail">ThreadDetail</div>,
	ThreadsList: ({ threads }: { threads: unknown[] }) => (
		<div data-testid="threads-list">{threads.length} threads</div>
	),
}));

const { Dashboard } = await import("./Dashboard");

const mockMissions = [
	{
		id: "m1",
		name: "Mission Alpha",
		path: "/tmp/m1",
		status: "active" as const,
		createdAt: "2024-01-01 10:00:00",
		updatedAt: "2024-01-01 10:00:00",
	},
	{
		id: "m2",
		name: "Mission Beta",
		path: "/tmp/m2",
		status: "completed" as const,
		createdAt: "2024-01-01 10:00:00",
		updatedAt: "2024-01-01 10:00:00",
	},
];

const mockMissionsResponse = {
	missionsDir: "/tmp/workspace",
	updatedAt: "2024-01-01 10:00:00",
	missions: mockMissions,
};

const mockMissionResponse = {
	mission: {
		schemaVersion: 1,
		id: "m1",
		name: "Mission Alpha",
		status: "active",
		createdAt: "2024-01-01 10:00:00",
		updatedAt: "2024-01-01 10:00:00",
	},
	roadmap: "# Roadmap\nStep 1",
};

const mockTasksResponse: TasksFile = {
	schemaVersion: 1,
	description: "Tasks",
	columns: [
		{ id: "todo", name: "To Do", order: 0 },
		{ id: "completed", name: "Completed", order: 1 },
	],
	tasks: [
		{
			id: "t1",
			title: "Task 1",
			description: "First task",
			columnId: "todo",
			statusNotes: "",
			createdAt: "2024-01-01 10:00:00",
			updatedAt: "2024-01-01 10:00:00",
		},
		{
			id: "t2",
			title: "Task 2",
			description: "Second task",
			columnId: "completed",
			statusNotes: "",
			createdAt: "2024-01-01 10:00:00",
			updatedAt: "2024-01-01 10:00:00",
		},
	],
};

const mockAgentsResponse = {
	schemaVersion: 1,
	agents: [
		{
			id: "agent-1",
			displayName: "Alice",
			systemRole: "worker",
			roleDescription: "Dev",
		},
	],
};

const mockThreadsResponse = [
	{
		taskId: "t1",
		messageCount: 2,
		lastMessageAt: "2024-01-02 10:00:00",
		lastAuthorAgentId: "agent-1",
		lastMentionsAgentIds: ["manager-1"],
	},
];

function mockAllApis() {
	(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
		async (url: string) => {
			if (url === "/api/missions") {
				return {
					ok: true,
					json: async () => mockMissionsResponse,
				};
			}
			if (url === "/api/missions/m1") {
				return {
					ok: true,
					json: async () => mockMissionResponse,
				};
			}
			if (url.endsWith("/tasks")) {
				return {
					ok: true,
					json: async () => mockTasksResponse,
				};
			}
			if (url.endsWith("/agents")) {
				return {
					ok: true,
					json: async () => mockAgentsResponse,
				};
			}
			if (url.endsWith("/threads")) {
				return {
					ok: true,
					json: async () => mockThreadsResponse,
				};
			}
			if (url.includes("/working/")) {
				return {
					ok: true,
					json: async () => ({ agentId: "agent-1", events: [] }),
				};
			}
			if (url.includes("/secrets/")) {
				return {
					ok: true,
					json: async () => ({ agentId: "agent-1", content: "" }),
				};
			}
			return { ok: false, status: 404 };
		},
	);
}

describe("Dashboard", () => {
	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("loads and renders missions on mount", async () => {
		mockAllApis();
		render(<Dashboard />);

		await waitFor(() => {
			expect(screen.getByTestId("mission-list")).toHaveTextContent(
				"Mission Alpha",
			);
		});
	});

	it("shows sidebar and header", async () => {
		mockAllApis();
		render(<Dashboard />);

		await waitFor(() => {
			expect(screen.getByTestId("sidebar")).toBeInTheDocument();
			expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
		});
	});

	it("loads mission data after missions load", async () => {
		mockAllApis();
		render(<Dashboard />);

		await waitFor(() => {
			expect(screen.getByTestId("dashboard-header")).toHaveTextContent(
				"Mission Alpha",
			);
		});
	});

	it("renders task board with task count and completion %", async () => {
		mockAllApis();
		render(<Dashboard />);

		// Wait for mission data to fully load (header shows mission name)
		await waitFor(() => {
			expect(screen.getByTestId("dashboard-header")).toHaveTextContent(
				"Mission Alpha",
			);
		});
		// 1 of 2 tasks completed = 50%
		expect(screen.getByText(/2 tasks/)).toBeInTheDocument();
		expect(screen.getByText(/50%/)).toBeInTheDocument();
	});

	it("renders agent dropdown", async () => {
		mockAllApis();
		render(<Dashboard />);

		await waitFor(() => {
			expect(screen.getByTestId("agent-dropdown")).toBeInTheDocument();
		});
	});

	it("shows error when missions fail to load", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			status: 500,
		});

		render(<Dashboard />);

		await waitFor(() => {
			expect(screen.getByTestId("error-banner")).toHaveTextContent(
				/unable to read missions/i,
			);
		});
	});

	it("shows error when mission data fails to load", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
			async (url: string) => {
				if (url === "/api/missions") {
					return {
						ok: true,
						json: async () => mockMissionsResponse,
					};
				}
				// All mission-specific calls fail
				return { ok: false, status: 500 };
			},
		);

		render(<Dashboard />);

		await waitFor(() => {
			expect(screen.getByTestId("error-banner")).toHaveTextContent(
				/unable to load mission data/i,
			);
		});
	});

	it("handles agents load failure gracefully", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
			async (url: string) => {
				if (url === "/api/missions") {
					return {
						ok: true,
						json: async () => mockMissionsResponse,
					};
				}
				if (url === "/api/missions/m1") {
					return {
						ok: true,
						json: async () => mockMissionResponse,
					};
				}
				if (url.endsWith("/tasks")) {
					return {
						ok: true,
						json: async () => mockTasksResponse,
					};
				}
				if (url.endsWith("/threads")) {
					return {
						ok: true,
						json: async () => mockThreadsResponse,
					};
				}
				// agents fails
				if (url.endsWith("/agents")) {
					return { ok: false, status: 500 };
				}
				return { ok: true, json: async () => ({}) };
			},
		);

		render(<Dashboard />);

		await waitFor(() => {
			expect(screen.getByTestId("error-banner")).toHaveTextContent(
				/unable to load agents/i,
			);
		});
	});

	it("shows threads list in sidebar", async () => {
		mockAllApis();
		render(<Dashboard />);

		await waitFor(() => {
			expect(screen.getByTestId("threads-list")).toHaveTextContent("1 threads");
		});
	});

	it("uses initialMissionId prop to select mission", async () => {
		mockAllApis();
		render(<Dashboard missionId="m1" />);

		await waitFor(() => {
			expect(screen.getByTestId("dashboard-header")).toHaveTextContent(
				"Mission Alpha",
			);
		});
	});

	it("shows thread detail when threadId is provided", async () => {
		mockAllApis();
		render(<Dashboard missionId="m1" threadId="t1" />);

		await waitFor(() => {
			expect(screen.getByTestId("thread-detail")).toBeInTheDocument();
		});
	});

	it("shows task board when no threadId is provided", async () => {
		mockAllApis();
		render(<Dashboard missionId="m1" />);

		await waitFor(() => {
			expect(screen.getByTestId("task-board")).toBeInTheDocument();
		});
		expect(screen.queryByTestId("thread-detail")).not.toBeInTheDocument();
	});

	it("shows 0% completion when no tasks", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
			async (url: string) => {
				if (url === "/api/missions") {
					return {
						ok: true,
						json: async () => mockMissionsResponse,
					};
				}
				if (url === "/api/missions/m1") {
					return {
						ok: true,
						json: async () => mockMissionResponse,
					};
				}
				if (url.endsWith("/tasks")) {
					return {
						ok: true,
						json: async () => ({
							schemaVersion: 1,
							description: "Tasks",
							columns: [],
							tasks: [],
						}),
					};
				}
				if (url.endsWith("/agents")) {
					return {
						ok: true,
						json: async () => mockAgentsResponse,
					};
				}
				if (url.endsWith("/threads")) {
					return {
						ok: true,
						json: async () => [],
					};
				}
				if (url.includes("/working/") || url.includes("/secrets/")) {
					return {
						ok: true,
						json: async () => ({ agentId: "agent-1", events: [], content: "" }),
					};
				}
				return { ok: false };
			},
		);

		render(<Dashboard />);

		await waitFor(() => {
			expect(screen.getByText("0%")).toBeInTheDocument();
		});
	});

	it("renders Task Board label", async () => {
		mockAllApis();
		render(<Dashboard />);

		await waitFor(() => {
			expect(screen.getByText("Task Board")).toBeInTheDocument();
		});
	});
});
