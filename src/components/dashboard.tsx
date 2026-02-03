"use client";

import { AlertTriangle, ClipboardList, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	LogFile,
	Mission,
	MissionIndexItem,
	TasksFile,
	WorkersFile,
} from "@/core/schemas";
import { cn } from "@/lib/utils";

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
	workerId: string;
	content: string;
};

const missionStatusTone: Record<Mission["status"], string> = {
	active: "border-primary/50 text-primary",
	paused: "border-amber-400/50 text-amber-600 dark:text-amber-300",
	archived: "border-border/60 text-muted-foreground",
	completed: "border-emerald-400/40 text-emerald-600 dark:text-emerald-300",
};

const logLevelTone: Record<"info" | "warn" | "error", string> = {
	info: "border-border/70 text-muted-foreground",
	warn: "border-amber-400/50 text-amber-600 dark:text-amber-300",
	error: "border-destructive/50 text-destructive",
};

const missionSkeletons = ["mission-a", "mission-b", "mission-c"];
const taskSkeletons = ["task-a", "task-b", "task-c", "task-d"];
const workerSkeletons = ["worker-a", "worker-b", "worker-c"];
const logSkeletons = ["log-a", "log-b", "log-c", "log-d"];

function isAbortError(error: unknown) {
	return error instanceof DOMException && error.name === "AbortError";
}

function formatDate(value?: string) {
	if (!value) {
		return "—";
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

export function Dashboard() {
	const [missionsDir, setMissionsDir] = React.useState<string | null>(null);
	const [missions, setMissions] = React.useState<MissionIndexItem[]>([]);
	const [activeMissionId, setActiveMissionId] = React.useState<string | null>(
		null,
	);
	const [mission, setMission] = React.useState<Mission | null>(null);
	const [roadmap, setRoadmap] = React.useState<string>("");
	const [tasks, setTasks] = React.useState<TasksFile | null>(null);
	const [workers, setWorkers] = React.useState<WorkersFile | null>(null);
	const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
	const [activeWorkerId, setActiveWorkerId] = React.useState<string | null>(
		null,
	);
	const [working, setWorking] = React.useState<string>("");
	const [log, setLog] = React.useState<LogFile | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [loadingMissions, setLoadingMissions] = React.useState(true);
	const [loadingMission, setLoadingMission] = React.useState(false);
	const [loadingWorker, setLoadingWorker] = React.useState(false);

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
				if (isAbortError(err)) {
					return;
				}
				setError("Unable to read missions index. Run clawion init first.");
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
		if (!activeMissionId) {
			setMission(null);
			setRoadmap("");
			setTasks(null);
			setWorkers(null);
			setActiveTaskId(null);
			setActiveWorkerId(null);
			return;
		}

		const controller = new AbortController();
		setLoadingMission(true);
		setError(null);

		async function loadMission() {
			try {
				const [missionResponse, tasksResponse, workersResponse] =
					await Promise.all([
						fetch(`/api/missions/${activeMissionId}`, {
							cache: "no-store",
							signal: controller.signal,
						}),
						fetch(`/api/missions/${activeMissionId}/tasks`, {
							cache: "no-store",
							signal: controller.signal,
						}),
						fetch(`/api/missions/${activeMissionId}/workers`, {
							cache: "no-store",
							signal: controller.signal,
						}),
					]);

				if (!missionResponse.ok) {
					throw new Error("Mission not found.");
				}

				const missionPayload =
					(await missionResponse.json()) as MissionResponse;
				const tasksPayload = (await tasksResponse.json()) as TasksFile;
				const workersPayload = (await workersResponse.json()) as WorkersFile;

				setMission(missionPayload.mission);
				setRoadmap(missionPayload.roadmap);
				setTasks(tasksPayload);
				setWorkers(workersPayload);

				setActiveTaskId((current) => {
					if (
						current &&
						tasksPayload.tasks.some((task) => task.id === current)
					) {
						return current;
					}
					return tasksPayload.tasks[0]?.id ?? null;
				});
				setActiveWorkerId((current) => {
					if (
						current &&
						workersPayload.workers.some((worker) => worker.id === current)
					) {
						return current;
					}
					return workersPayload.workers[0]?.id ?? null;
				});
			} catch (err) {
				if (isAbortError(err)) {
					return;
				}
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

	React.useEffect(() => {
		if (!activeMissionId || !activeWorkerId) {
			setWorking("");
			setLog(null);
			return;
		}

		const controller = new AbortController();
		setLoadingWorker(true);

		async function loadWorker() {
			try {
				const [workingResponse, logResponse] = await Promise.all([
					fetch(`/api/missions/${activeMissionId}/working/${activeWorkerId}`, {
						cache: "no-store",
						signal: controller.signal,
					}),
					fetch(`/api/missions/${activeMissionId}/logs/${activeWorkerId}`, {
						cache: "no-store",
						signal: controller.signal,
					}),
				]);
				const workingPayload =
					(await workingResponse.json()) as WorkingResponse;
				const logPayload = (await logResponse.json()) as LogFile;
				setWorking(workingPayload.content);
				setLog(logPayload);
			} catch (err) {
				if (isAbortError(err)) {
					return;
				}
				setWorking("");
				setLog(null);
			} finally {
				setLoadingWorker(false);
			}
		}

		void loadWorker();

		return () => {
			controller.abort();
		};
	}, [activeMissionId, activeWorkerId]);

	const tasksColumns = tasks?.columns
		? [...tasks.columns].sort((a, b) => a.order - b.order)
		: [];

	const tasksByColumn = React.useMemo(() => {
		const map = new Map<string, TasksFile["tasks"]>();
		if (!tasks) {
			return map;
		}
		for (const column of tasks.columns) {
			map.set(column.id, []);
		}
		for (const task of tasks.tasks) {
			const list = map.get(task.columnId) ?? [];
			list.push(task);
			map.set(task.columnId, list);
		}
		return map;
	}, [tasks]);

	const completion = React.useMemo(() => {
		if (!tasks || tasks.tasks.length === 0) {
			return 0;
		}

		const doneColumn =
			tasks.columns.find((column) => column.id.toLowerCase() === "done") ??
			tasks.columns.find((column) =>
				column.name.toLowerCase().includes("done"),
			) ??
			tasks.columns[tasks.columns.length - 1];

		const doneCount = tasks.tasks.filter(
			(task) => task.columnId === doneColumn?.id,
		).length;
		return Math.round((doneCount / tasks.tasks.length) * 100);
	}, [tasks]);

	const activeWorker = workers?.workers.find(
		(worker) => worker.id === activeWorkerId,
	);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[260px_1fr]">
				<aside className="flex flex-col gap-4">
					<div className="rounded-2xl border border-border/70 bg-card p-4">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
								<Sparkles className="h-4 w-4" />
							</div>
							<div>
								<p className="text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground">
									Clawion
								</p>
								<p className="text-sm font-semibold">Mission Board</p>
							</div>
						</div>
						<div className="mt-4 text-xs text-muted-foreground">
							Workspace
							<div className="mt-1 rounded-lg border border-border/70 bg-background px-2 py-1 font-mono text-[0.65rem]">
								{missionsDir ?? "—"}
							</div>
						</div>
					</div>

					<Card className="border-border/70">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Missions</CardTitle>
							<CardDescription className="text-xs">index.json</CardDescription>
						</CardHeader>
						<CardContent className="flex max-h-[240px] flex-col gap-2 overflow-y-auto pr-1">
							{loadingMissions ? (
								missionSkeletons.map((key) => (
									<div
										key={key}
										className="rounded-lg border border-border/70 bg-background p-3"
									>
										<Skeleton className="h-3 w-24" />
									</div>
								))
							) : missions.length === 0 ? (
								<div className="rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
									No missions yet.
								</div>
							) : (
								missions.map((item) => {
									const isActive = item.id === activeMissionId;
									return (
										<button
											key={item.id}
											onClick={() => setActiveMissionId(item.id)}
											type="button"
											className={cn(
												"rounded-lg border border-border/70 bg-background px-3 py-2 text-left text-xs text-foreground transition",
												isActive && "border-primary/60 bg-primary/10",
											)}
										>
											<div className="flex items-center justify-between gap-2">
												<span className="font-medium">{item.name}</span>
												<span className="text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
													{item.status}
												</span>
											</div>
											<p className="mt-1 line-clamp-2 text-[0.65rem] text-muted-foreground">
												{item.description}
											</p>
										</button>
									);
								})
							)}
						</CardContent>
					</Card>

					<Card className="border-border/70">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Tasks</CardTitle>
							<CardDescription className="text-xs">
								Secondary menu
							</CardDescription>
						</CardHeader>
						<CardContent className="flex max-h-[280px] flex-col gap-2 overflow-y-auto pr-1">
							{loadingMission ? (
								taskSkeletons.map((key) => (
									<div
										key={key}
										className="rounded-lg border border-border/70 bg-background p-3"
									>
										<Skeleton className="h-3 w-28" />
									</div>
								))
							) : tasks?.tasks.length ? (
								tasks.tasks.map((task) => {
									const isActive = task.id === activeTaskId;
									return (
										<div
											key={task.id}
											className={cn(
												"rounded-lg border border-border/70 bg-background px-3 py-2",
												isActive && "border-primary/60 bg-primary/10",
											)}
										>
											<button
												onClick={() => setActiveTaskId(task.id)}
												type="button"
												className="w-full text-left text-xs font-medium text-foreground"
											>
												{task.title}
											</button>
											{activeMissionId ? (
												<Link
													className="mt-1 inline-flex text-[0.65rem] text-primary"
													href={`/missions/${activeMissionId}/tasks/${task.id}`}
												>
													Open thread
												</Link>
											) : null}
										</div>
									);
								})
							) : (
								<div className="rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
									No tasks yet.
								</div>
							)}
						</CardContent>
					</Card>
				</aside>

				<section className="flex flex-col gap-4">
					<header className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
								Mission Control
							</p>
							<h1 className="font-display text-2xl text-foreground">
								{mission?.name ?? "Select a mission"}
							</h1>
						</div>
						<div className="flex items-center gap-3">
							<ThemeToggle />
						</div>
					</header>

					{error ? (
						<Card className="border-destructive/40 bg-destructive/10">
							<CardContent className="flex items-center gap-3 py-3 text-sm text-destructive">
								<AlertTriangle className="h-4 w-4" />
								{error}
							</CardContent>
						</Card>
					) : null}

					<div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
						<Card className="border-border/70">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm">Mission Snapshot</CardTitle>
								<CardDescription className="text-xs">
									mission.json + ROADMAP
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium">{mission?.name ?? "—"}</p>
									<Badge
										variant="outline"
										className={cn(
											"rounded-full text-[0.6rem] uppercase tracking-[0.3em]",
											mission ? missionStatusTone[mission.status] : "",
										)}
									>
										{mission?.status ?? "—"}
									</Badge>
								</div>
								<p className="text-xs text-muted-foreground">
									{mission?.description ??
										"Select a mission to view its summary."}
								</p>
								<div className="rounded-lg border border-border/70 bg-background p-2 text-[0.65rem] text-muted-foreground whitespace-pre-wrap">
									{loadingMission
										? "Loading ROADMAP.md..."
										: roadmap || "No roadmap yet."}
								</div>
								<div className="text-[0.65rem] text-muted-foreground">
									Created {formatDate(mission?.createdAt)} · Updated{" "}
									{formatDate(mission?.updatedAt)}
								</div>
							</CardContent>
						</Card>

						<Card className="border-border/70">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm">Workers & Logs</CardTitle>
								<CardDescription className="text-xs">
									workers.json + logs
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
										<Users className="h-3.5 w-3.5" />
										Roster
									</div>
									<Badge
										variant="outline"
										className="rounded-full text-[0.6rem]"
									>
										{workers?.workers.length ?? 0}
									</Badge>
								</div>
								<div className="flex flex-wrap gap-2">
									{loadingMission
										? workerSkeletons.map((key) => (
												<div
													key={key}
													className="rounded-full border border-border/70 bg-background px-3 py-1"
												>
													<Skeleton className="h-3 w-16" />
												</div>
											))
										: workers?.workers.map((worker) => {
												const isActive = worker.id === activeWorkerId;
												return (
													<button
														key={worker.id}
														onClick={() => setActiveWorkerId(worker.id)}
														type="button"
														className={cn(
															"rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-foreground",
															isActive && "border-primary/60 bg-primary/10",
														)}
													>
														{worker.displayName}
													</button>
												);
											})}
								</div>
								<div className="rounded-lg border border-border/70 bg-background p-2 text-xs text-muted-foreground">
									<p className="text-sm font-medium text-foreground">
										{activeWorker?.displayName ?? "No worker selected"}
									</p>
									<p className="mt-1">
										{activeWorker?.roleDescription ??
											"Select a worker to view details."}
									</p>
									<p className="mt-2 text-[0.6rem] uppercase tracking-[0.3em]">
										{activeWorker?.systemRole ?? "—"} ·{" "}
										{activeWorker?.status ?? "—"}
									</p>
								</div>
								<Tabs defaultValue="working" className="mt-2">
									<TabsList variant="line" className="gap-3">
										<TabsTrigger value="working">Working</TabsTrigger>
										<TabsTrigger value="logs">Logs</TabsTrigger>
									</TabsList>
									<TabsContent value="working" className="mt-2">
										<div className="max-h-[140px] overflow-y-auto rounded-lg border border-border/70 bg-background p-2 text-[0.65rem] text-muted-foreground whitespace-pre-wrap">
											{loadingWorker
												? "Loading working memory..."
												: working || "No working memory file yet."}
										</div>
									</TabsContent>
									<TabsContent value="logs" className="mt-2">
										<div className="flex max-h-[140px] flex-col gap-2 overflow-y-auto pr-1">
											{loadingWorker ? (
												logSkeletons.map((key) => (
													<div
														key={key}
														className="rounded-lg border border-border/70 bg-background p-2"
													>
														<Skeleton className="h-3 w-24" />
													</div>
												))
											) : log?.events.length ? (
												log.events.map((event) => (
													<div
														key={event.id}
														className="rounded-lg border border-border/70 bg-background p-2"
													>
														<div className="flex items-center justify-between gap-2 text-[0.65rem] text-muted-foreground">
															<span>{event.type}</span>
															<Badge
																variant="outline"
																className={cn(
																	"rounded-full text-[0.6rem] uppercase tracking-[0.3em]",
																	logLevelTone[event.level],
																)}
															>
																{event.level}
															</Badge>
														</div>
														<p className="mt-1 text-xs text-foreground">
															{event.message}
														</p>
													</div>
												))
											) : (
												<div className="rounded-lg border border-border/70 bg-background p-2 text-xs text-muted-foreground">
													No logs for this worker yet.
												</div>
											)}
										</div>
									</TabsContent>
								</Tabs>
							</CardContent>
						</Card>
					</div>

					<Card className="border-border/70">
						<CardHeader className="flex-row items-center justify-between gap-4 pb-3">
							<div>
								<CardTitle className="text-base">Task Board</CardTitle>
								<CardDescription className="text-xs">
									One column per task column.
								</CardDescription>
							</div>
							<div className="flex items-center gap-3 text-xs text-muted-foreground">
								<ClipboardList className="h-3.5 w-3.5" />
								<span>{tasks?.tasks.length ?? 0} tasks</span>
								<Progress
									value={completion}
									className="h-2 w-24 [&>[data-slot=progress-indicator]]:bg-primary"
								/>
								<span>{completion}%</span>
							</div>
						</CardHeader>
						<CardContent>
							{loadingMission ? (
								<div className="grid gap-3 md:grid-cols-2">
									{taskSkeletons.map((key) => (
										<div
											key={key}
											className="rounded-xl border border-border/70 bg-background p-4"
										>
											<Skeleton className="h-4 w-32" />
											<Skeleton className="mt-4 h-2 w-full" />
										</div>
									))}
								</div>
							) : tasksColumns.length === 0 ? (
								<div className="rounded-xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
									No tasks yet. Create them via CLI.
								</div>
							) : (
								<div className="flex gap-4 overflow-x-auto pb-2">
									{tasksColumns.map((column) => {
										const columnTasks = tasksByColumn.get(column.id) ?? [];
										return (
											<div key={column.id} className="w-[280px]">
												<div className="flex items-center justify-between">
													<p className="text-sm font-medium text-foreground">
														{column.name}
													</p>
													<Badge
														variant="outline"
														className="rounded-full text-[0.6rem]"
													>
														{columnTasks.length}
													</Badge>
												</div>
												<div className="mt-3 flex flex-col gap-3">
													{columnTasks.length === 0 ? (
														<div className="rounded-xl border border-border/70 bg-background p-3 text-xs text-muted-foreground">
															No tasks here.
														</div>
													) : (
														columnTasks.map((task) => {
															const isBlocked = task.statusNotes
																.toLowerCase()
																.startsWith("blocked:");
															const isActive = task.id === activeTaskId;
															return (
																<div
																	key={task.id}
																	className={cn(
																		"rounded-xl border border-border/70 bg-background p-3",
																		isActive &&
																			"border-primary/60 bg-primary/10",
																	)}
																>
																	<div className="flex items-start justify-between gap-2">
																		<button
																			onClick={() => setActiveTaskId(task.id)}
																			type="button"
																			className="text-left"
																		>
																			<p className="text-sm font-medium text-foreground">
																				{task.title}
																			</p>
																			<p className="mt-1 text-xs text-muted-foreground">
																				{task.description}
																			</p>
																		</button>
																		{activeMissionId ? (
																			<Link
																				className="text-[0.65rem] text-primary"
																				href={`/missions/${activeMissionId}/tasks/${task.id}`}
																			>
																				Thread
																			</Link>
																		) : null}
																	</div>
																	{task.statusNotes ? (
																		<p className="mt-2 text-xs text-muted-foreground">
																			{task.statusNotes}
																		</p>
																	) : null}
																	<div className="mt-3 flex flex-wrap items-center gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
																		<Badge
																			variant={
																				isBlocked ? "destructive" : "outline"
																			}
																			className="rounded-full"
																		>
																			{task.id}
																		</Badge>
																		{task.assigneeId ? (
																			<span>Assigned: {task.assigneeId}</span>
																		) : (
																			<span>Unassigned</span>
																		)}
																	</div>
																</div>
															);
														})
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>
				</section>
			</div>
		</div>
	);
}
