"use client";

import { Sparkles } from "lucide-react";
import * as React from "react";
import type {
	AgentsFile,
	Mission,
	MissionIndexItem,
	TasksFile,
	ThreadSummary,
	WorkingEvent,
} from "@/core/schemas";
import { cn } from "@/lib/utils";
import {
	AgentDropdown,
	DashboardHeader,
	ErrorBanner,
	MissionList,
	Sidebar,
	TaskBoardSection,
	ThreadDetail,
	ThreadsList,
} from "./index";

type MissionsResponse = {
	missionsDir: string;
	updatedAt: string;
	missions: MissionIndexItem[];
};

type MissionResponse = {
	mission: Mission;
	roadmap: string;
};

type WorkingResponse = {
	agentId: string;
	events: WorkingEvent[];
};

type MemoryResponse = {
	agentId: string;
	content: string;
};

function isAbortError(error: unknown) {
	return error instanceof DOMException && error.name === "AbortError";
}

type DashboardProps = {
	missionId?: string;
	threadId?: string;
};

export function Dashboard({
	missionId: initialMissionId,
	threadId: initialThreadId,
}: DashboardProps) {
	const [missionsDir, setMissionsDir] = React.useState<string | null>(null);
	const [missions, setMissions] = React.useState<MissionIndexItem[]>([]);
	const [activeMissionId, setActiveMissionId] = React.useState<string | null>(
		null,
	);
	const [activeThreadId, setActiveThreadId] = React.useState<string | null>(
		null,
	);
	const [mission, setMission] = React.useState<Mission | null>(null);
	const [roadmap, setRoadmap] = React.useState<string>("");
	const [tasks, setTasks] = React.useState<TasksFile | null>(null);
	const [threads, setThreads] = React.useState<ThreadSummary[]>([]);
	const [agents, setAgents] = React.useState<AgentsFile | null>(null);
	const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
	const [activeAgentId, setActiveAgentId] = React.useState<string | null>(null);
	const [working, setWorking] = React.useState<WorkingEvent[]>([]);
	const [memory, setMemory] = React.useState<string>("");
	const [error, setError] = React.useState<string | null>(null);
	const [loadingMissions, setLoadingMissions] = React.useState(true);
	const [loadingMission, setLoadingMission] = React.useState(false);
	const [loadingAgent, setLoadingAgent] = React.useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

	// Mission loading
	React.useEffect(() => {
		const controller = new AbortController();

		async function loadMissions() {
			setLoadingMissions(true);
			setError(null);
			try {
				const response = await fetch("/api/missions", {
					cache: "no-store",
					signal: controller.signal,
				});
				if (!response.ok) {
					throw new Error("Failed to load missions index.");
				}
				const payload = (await response.json()) as MissionsResponse;
				setMissionsDir(payload.missionsDir);
				setMissions(payload.missions);

				setActiveMissionId((current) => {
					if (current && payload.missions.some((item) => item.id === current)) {
						return current;
					}
					return payload.missions[0]?.id ?? null;
				});
			} catch (err) {
				if (isAbortError(err)) return;
				setError(
					"Unable to read missions index. Create a mission first using the CLI.",
				);
			} finally {
				setLoadingMissions(false);
			}
		}

		void loadMissions();

		return () => {
			controller.abort();
		};
	}, []);

	React.useEffect(() => {
		if (!initialMissionId || missions.length === 0) {
			return;
		}

		if (missions.some((item) => item.id === initialMissionId)) {
			setActiveMissionId(initialMissionId);
		}
	}, [initialMissionId, missions]);

	// Mission data loading
	React.useEffect(() => {
		if (!activeMissionId) {
			setMission(null);
			setRoadmap("");
			setTasks(null);
			setThreads([]);
			setAgents(null);
			setActiveTaskId(null);
			setActiveAgentId(null);
			return;
		}

		const controller = new AbortController();
		setLoadingMission(true);
		setError(null);

		async function loadMission() {
			try {
				const [
					missionResponse,
					tasksResponse,
					agentsResponse,
					threadsResponse,
				] = await Promise.all([
					fetch(`/api/missions/${activeMissionId}`, {
						cache: "no-store",
						signal: controller.signal,
					}),
					fetch(`/api/missions/${activeMissionId}/tasks`, {
						cache: "no-store",
						signal: controller.signal,
					}),
					fetch(`/api/missions/${activeMissionId}/agents`, {
						cache: "no-store",
						signal: controller.signal,
					}),
					fetch(`/api/missions/${activeMissionId}/threads`, {
						cache: "no-store",
						signal: controller.signal,
					}),
				]);

				if (!missionResponse.ok) {
					throw new Error("Mission not found.");
				}
				if (!tasksResponse.ok) {
					throw new Error("Failed to load tasks.");
				}
				if (!threadsResponse.ok) {
					throw new Error("Failed to load threads.");
				}

				const missionPayload =
					(await missionResponse.json()) as MissionResponse;
				const tasksPayload = (await tasksResponse.json()) as TasksFile;
				const threadsPayload =
					(await threadsResponse.json()) as ThreadSummary[];

				let agentsPayload: AgentsFile = { schemaVersion: 1, agents: [] };
				let agentsWarning: string | null = null;

				if (!agentsResponse.ok) {
					agentsWarning = "Unable to load agents. Verify agents.json exists.";
				} else {
					const raw = (await agentsResponse.json()) as Partial<AgentsFile>;
					agentsPayload = {
						schemaVersion: raw.schemaVersion ?? 1,
						agents: Array.isArray(raw.agents) ? raw.agents : [],
					};
				}

				setMission(missionPayload.mission);
				setRoadmap(missionPayload.roadmap);
				setTasks(tasksPayload);
				setThreads(threadsPayload);
				setAgents(agentsPayload);
				if (agentsWarning) {
					setError(agentsWarning);
				}

				setActiveTaskId((current) => {
					if (
						current &&
						tasksPayload.tasks.some((task) => task.id === current)
					) {
						return current;
					}
					return null;
				});
				setActiveAgentId((current) => {
					if (
						current &&
						(agentsPayload.agents ?? []).some((agent) => agent.id === current)
					) {
						return current;
					}
					return agentsPayload.agents?.[0]?.id ?? null;
				});
			} catch (err) {
				if (isAbortError(err)) return;
				setError("Unable to load mission data. Verify the workspace files.");
			} finally {
				setLoadingMission(false);
			}
		}

		void loadMission();

		return () => {
			controller.abort();
		};
	}, [activeMissionId]);

	// Sync activeThreadId with initialThreadId prop
	React.useEffect(() => {
		setActiveThreadId(initialThreadId ?? null);
	}, [initialThreadId]);

	// Agent data loading
	React.useEffect(() => {
		if (!activeMissionId || !activeAgentId) {
			setWorking([]);
			setMemory("");
			return;
		}

		const controller = new AbortController();
		setLoadingAgent(true);

		async function loadAgent() {
			try {
				const [workingResponse, memoryResponse] = await Promise.all([
					fetch(`/api/missions/${activeMissionId}/working/${activeAgentId}`, {
						cache: "no-store",
						signal: controller.signal,
					}),
					fetch(`/api/missions/${activeMissionId}/memory/${activeAgentId}`, {
						cache: "no-store",
						signal: controller.signal,
					}),
				]);

				if (!workingResponse.ok || !memoryResponse.ok) {
					setWorking([]);
					setMemory("");
					return;
				}

				const workingPayload =
					(await workingResponse.json()) as WorkingResponse;
				const memoryPayload = (await memoryResponse.json()) as MemoryResponse;
				setWorking(workingPayload.events);
				setMemory(memoryPayload.content);
			} catch (err) {
				if (isAbortError(err)) return;
				setWorking([]);
				setMemory("");
			} finally {
				setLoadingAgent(false);
			}
		}

		void loadAgent();

		return () => {
			controller.abort();
		};
	}, [activeMissionId, activeAgentId]);

	// Derived state
	const tasksColumns = React.useMemo(
		() =>
			tasks?.columns
				? [...tasks.columns].sort((a, b) => a.order - b.order)
				: [],
		[tasks],
	);

	const agentMap = React.useMemo(
		() =>
			new Map(
				agents?.agents.map((agent) => [agent.id, agent.displayName]) ?? [],
			),
		[agents],
	);

	const taskMap = React.useMemo(
		() => new Map(tasks?.tasks.map((task) => [task.id, task.title]) ?? []),
		[tasks],
	);

	const completion = React.useMemo(() => {
		if (!tasks || tasks.tasks.length === 0) return 0;

		const completedColumn =
			tasks.columns.find((column) => column.id.toLowerCase() === "completed") ??
			tasks.columns.find((column) =>
				column.name.toLowerCase().includes("complete"),
			) ??
			tasks.columns[tasks.columns.length - 1];

		const doneCount = tasks.tasks.filter(
			(task) => task.columnId === completedColumn?.id,
		).length;

		return Math.round((doneCount / tasks.tasks.length) * 100);
	}, [tasks]);

	// Sorted threads: newest activity first
	const sortedThreads = React.useMemo(() => {
		return [...threads].sort((a, b) => {
			const aTime = new Date(a.lastMessageAt ?? 0).getTime();
			const bTime = new Date(b.lastMessageAt ?? 0).getTime();
			return bTime - aTime;
		});
	}, [threads]);

	const showMissionSkeleton = loadingMission && !tasks;
	const showThreadsSkeleton = loadingMission && threads.length === 0;
	const showAgentsSkeleton = loadingMission && !agents;

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="flex min-h-screen">
				<Sidebar
					missionsDir={missionsDir}
					sidebarCollapsed={sidebarCollapsed}
					onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
				>
					{/* Missions Section */}
					<div className="shrink-0 space-y-2">
						<div className="flex items-center justify-between">
							{!sidebarCollapsed && (
								<p className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
									Missions
								</p>
							)}
						</div>
						<div
							className={cn(
								"flex flex-col gap-2",
								sidebarCollapsed && "items-center",
							)}
						>
							<MissionList
								missions={missions}
								activeMissionId={activeMissionId}
								loadingMissions={loadingMissions}
								sidebarCollapsed={sidebarCollapsed}
							/>
						</div>
					</div>

					{/* Threads Section */}
					{!sidebarCollapsed ? (
						<div className="flex min-h-0 flex-1 flex-col gap-2">
							<p className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
								Threads
							</p>
							<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-thin pr-1">
								<ThreadsList
									threads={sortedThreads}
									agentMap={agentMap}
									taskMap={taskMap}
									loadingMission={showThreadsSkeleton}
									activeMissionId={activeMissionId}
									activeThreadId={activeThreadId}
								/>
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center gap-2 text-[0.65rem] text-muted-foreground">
							<Sparkles className="h-4 w-4" />
							<span>{sortedThreads.length} threads</span>
						</div>
					)}
				</Sidebar>

				<section className="flex min-h-screen flex-1 flex-col">
					<DashboardHeader
						mission={mission}
						roadmap={roadmap}
						loadingMission={loadingMission}
					/>

					<main className="flex flex-1 flex-col gap-6 px-6 py-6">
						<ErrorBanner error={error} />

						{activeThreadId && mission ? (
							<ThreadDetail
								missionId={activeMissionId ?? ""}
								threadId={activeThreadId}
								mission={mission}
								agentMap={agentMap}
							/>
						) : (
							<TaskBoardSection
								loadingMission={showMissionSkeleton}
								tasksColumns={tasksColumns}
								tasksFile={tasks}
								threads={threads}
								activeTaskId={activeTaskId}
								activeMissionId={activeMissionId}
								agentMap={agentMap}
								onTaskSelect={setActiveTaskId}
							>
								{/* Progress stats with agent panel */}
								<div className="flex flex-wrap items-center justify-between gap-4">
									<div>
										<div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
											<Sparkles className="h-3.5 w-3.5" />
											Task Board
										</div>
										<p className="mt-2 text-sm text-muted-foreground">
											Dragless, CLI-driven. One column per status.
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
										<span>{tasks?.tasks.length ?? 0} tasks</span>
										<div
											className={cn(
												"flex h-2 w-24 overflow-hidden rounded-full bg-muted",
											)}
										>
											<div
												className="h-full bg-primary transition-all"
												style={{ width: `${completion}%` }}
											/>
										</div>
										<span>{completion}%</span>
									</div>
								</div>

								{/* Agent panel */}
								<div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
									<div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-wide">
										<span>Agents</span>
									</div>
									<AgentDropdown
										agents={agents}
										loadingMission={showAgentsSkeleton}
										activeAgentId={activeAgentId}
										onAgentSelect={setActiveAgentId}
										working={working}
										memory={memory}
										loadingAgent={loadingAgent}
									/>
								</div>
							</TaskBoardSection>
						)}
					</main>
				</section>
			</div>
		</div>
	);
}
