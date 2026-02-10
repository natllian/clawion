"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import type {
	AgentsFile,
	Mission,
	MissionIndexItem,
	TasksFile,
	ThreadSummary,
	WorkingEvent,
} from "@/core/schemas";
import { resolveStatusForColumn } from "@/core/task-status";
import { cn } from "@/lib/utils";
import {
	fetchAgentSnapshotPayload,
	saveAgentRoleDescription,
	saveAgentSecret,
} from "./agent-snapshot-api";
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
import { pillClass } from "./pill-tokens";

type MissionsResponse = {
	missionsDir: string;
	updatedAt: string;
	missions: MissionIndexItem[];
};

type MissionResponse = {
	mission: Mission;
	roadmap: string;
};

type ThreadListItem = ThreadSummary & {
	unackedMentionCount: number;
	pendingAckAgentIds: string[];
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
	const router = useRouter();
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
	const [threads, setThreads] = React.useState<ThreadListItem[]>([]);
	const [agents, setAgents] = React.useState<AgentsFile | null>(null);
	const [activeAgentId, setActiveAgentId] = React.useState<string | null>(null);
	const [working, setWorking] = React.useState<WorkingEvent[]>([]);
	const [roleDescription, setRoleDescription] = React.useState<string>("");
	const [savingRoleDescription, setSavingRoleDescription] =
		React.useState(false);
	const [darkSecret, setDarkSecret] = React.useState<string>("");
	const [savingDarkSecret, setSavingDarkSecret] = React.useState(false);
	const [savingRoadmap, setSavingRoadmap] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [loadingMissions, setLoadingMissions] = React.useState(true);
	const [loadingMission, setLoadingMission] = React.useState(false);
	const [loadingAgent, setLoadingAgent] = React.useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

	const handleMissionDeleted = React.useCallback(
		(deletedId: string) => {
			async function refetch() {
				const response = await fetch("/api/missions", {
					cache: "no-store",
				});
				if (!response.ok) return;
				const payload = (await response.json()) as MissionsResponse;
				setMissionsDir(payload.missionsDir);
				setMissions(payload.missions);
				setActiveMissionId((current) => {
					if (current === deletedId) {
						const next = payload.missions[0]?.id ?? null;
						if (next) {
							router.push(`/missions/${next}`);
						} else {
							router.push("/");
						}
						return next;
					}
					return current;
				});
			}
			void refetch();
		},
		[router],
	);

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
				const threadsPayloadRaw = (await threadsResponse.json()) as Array<
					ThreadSummary &
						Partial<
							Pick<ThreadListItem, "unackedMentionCount" | "pendingAckAgentIds">
						>
				>;
				const threadsPayload: ThreadListItem[] = threadsPayloadRaw.map(
					(thread) => ({
						...thread,
						unackedMentionCount: thread.unackedMentionCount ?? 0,
						pendingAckAgentIds: Array.isArray(thread.pendingAckAgentIds)
							? thread.pendingAckAgentIds
							: [],
					}),
				);

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
			setRoleDescription("");
			setDarkSecret("");
			return;
		}
		const missionId = activeMissionId;
		const agentId = activeAgentId;

		const controller = new AbortController();
		setLoadingAgent(true);

		async function loadAgent() {
			try {
				const snapshot = await fetchAgentSnapshotPayload(
					missionId,
					agentId,
					controller.signal,
				);
				if (!snapshot) {
					setWorking([]);
					setDarkSecret("");
					return;
				}

				setWorking(snapshot.working);
				setDarkSecret(snapshot.secret);
			} catch (err) {
				if (isAbortError(err)) return;
				setWorking([]);
				setDarkSecret("");
			} finally {
				setLoadingAgent(false);
			}
		}

		void loadAgent();

		return () => {
			controller.abort();
		};
	}, [activeMissionId, activeAgentId]);

	React.useEffect(() => {
		if (!activeAgentId) {
			setRoleDescription("");
			return;
		}
		const currentAgent = agents?.agents.find(
			(agent) => agent.id === activeAgentId,
		);
		setRoleDescription(currentAgent?.roleDescription ?? "");
	}, [activeAgentId, agents]);

	const saveDarkSecret = React.useCallback(
		async (agentId: string, content: string) => {
			if (!activeMissionId) return;
			setSavingDarkSecret(true);
			try {
				await saveAgentSecret(activeMissionId, agentId, content);
				setDarkSecret(content);
			} catch (err) {
				if (!isAbortError(err)) {
					setError("Unable to save dark secret.");
				}
			} finally {
				setSavingDarkSecret(false);
			}
		},
		[activeMissionId],
	);

	const saveRoleDescription = React.useCallback(
		async (agentId: string, content: string) => {
			if (!activeMissionId) return;
			setSavingRoleDescription(true);
			try {
				await saveAgentRoleDescription(activeMissionId, agentId, content);
				setAgents((current) => {
					if (!current) return current;
					return {
						...current,
						agents: current.agents.map((agent) =>
							agent.id === agentId
								? {
										...agent,
										roleDescription: content,
									}
								: agent,
						),
					};
				});
				setRoleDescription(content);
			} catch (err) {
				if (!isAbortError(err)) {
					setError("Unable to save role description.");
				}
			} finally {
				setSavingRoleDescription(false);
			}
		},
		[activeMissionId],
	);

	const saveRoadmap = React.useCallback(
		async (nextRoadmap: string) => {
			if (!activeMissionId) return;
			setSavingRoadmap(true);
			try {
				const response = await fetch(`/api/missions/${activeMissionId}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ roadmap: nextRoadmap }),
				});
				if (!response.ok) {
					throw new Error("Failed to save roadmap.");
				}
				const payload = (await response.json()) as MissionResponse;
				setMission(payload.mission);
				setRoadmap(payload.roadmap);
			} catch (err) {
				if (!isAbortError(err)) {
					setError("Unable to save roadmap.");
				}
			} finally {
				setSavingRoadmap(false);
			}
		},
		[activeMissionId],
	);

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

		const doneCount = tasks.tasks.filter(
			(task) =>
				resolveStatusForColumn(tasks.columns, task.columnId) === "completed",
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

	const handleToggleSidebar = React.useCallback(
		() => setSidebarCollapsed((v) => !v),
		[],
	);

	return (
		<div className="h-screen overflow-hidden bg-background text-foreground">
			<div className="flex h-full">
				<Sidebar
					missionsDir={missionsDir}
					sidebarCollapsed={sidebarCollapsed}
					onToggleCollapse={handleToggleSidebar}
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
								onDeleteMission={handleMissionDeleted}
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
							<span className={pillClass}>{sortedThreads.length}</span>
						</div>
					)}
				</Sidebar>

				<section className="flex min-h-0 h-full flex-1 flex-col">
					<DashboardHeader
						mission={mission}
						roadmap={roadmap}
						loadingMission={loadingMission}
						onRoadmapSave={saveRoadmap}
						savingRoadmap={savingRoadmap}
					/>

					<main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
						<ErrorBanner error={error} />

						{activeThreadId && mission && activeMissionId ? (
							<ThreadDetail
								missionId={activeMissionId}
								threadId={activeThreadId}
								agentMap={agentMap}
								agents={agents}
							/>
						) : (
							<TaskBoardSection
								loadingMission={showMissionSkeleton}
								tasksColumns={tasksColumns}
								tasksFile={tasks}
								threads={threads}
								activeMissionId={activeMissionId}
								agentMap={agentMap}
							>
								{/* Progress stats with agent panel */}
								<div className="flex flex-wrap items-center justify-between gap-4">
									<div>
										<div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
											<Sparkles className="h-3.5 w-3.5" />
											Task Board
										</div>
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
										roleDescription={roleDescription}
										onRoleDescriptionChange={setRoleDescription}
										onRoleDescriptionSave={saveRoleDescription}
										savingRoleDescription={savingRoleDescription}
										darkSecret={darkSecret}
										onDarkSecretChange={setDarkSecret}
										onDarkSecretSave={saveDarkSecret}
										savingDarkSecret={savingDarkSecret}
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
