"use client";

import {
	Activity,
	AlertTriangle,
	ClipboardList,
	MessagesSquare,
	Sparkles,
	Users,
} from "lucide-react";
import * as React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	LogFile,
	Mission,
	MissionIndexItem,
	TasksFile,
	ThreadFile,
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
const threadSkeletons = ["thread-a", "thread-b", "thread-c"];
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
	const [thread, setThread] = React.useState<ThreadFile | null>(null);
	const [working, setWorking] = React.useState<string>("");
	const [log, setLog] = React.useState<LogFile | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [loadingMissions, setLoadingMissions] = React.useState(true);
	const [loadingMission, setLoadingMission] = React.useState(false);
	const [loadingThread, setLoadingThread] = React.useState(false);
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
		if (!activeMissionId || !activeTaskId) {
			setThread(null);
			return;
		}

		const controller = new AbortController();
		setLoadingThread(true);

		async function loadThread() {
			try {
				const response = await fetch(
					`/api/missions/${activeMissionId}/threads/${activeTaskId}`,
					{
						cache: "no-store",
						signal: controller.signal,
					},
				);
				if (!response.ok) {
					throw new Error("Thread not found.");
				}
				const payload = (await response.json()) as ThreadFile;
				setThread(payload);
			} catch (err) {
				if (isAbortError(err)) {
					return;
				}
				setThread(null);
			} finally {
				setLoadingThread(false);
			}
		}

		void loadThread();

		return () => {
			controller.abort();
		};
	}, [activeMissionId, activeTaskId]);

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

	const activeTask = tasks?.tasks.find((task) => task.id === activeTaskId);
	const activeWorker = workers?.workers.find(
		(worker) => worker.id === activeWorkerId,
	);

	return (
		<div className="relative min-h-screen overflow-hidden">
			<div className="pointer-events-none absolute inset-0">
				<div className="aurora absolute inset-0 opacity-90" />
				<div className="magic-grid absolute inset-0 opacity-70" />
				<div className="magic-noise absolute inset-0" />
				<div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-chart-4/40 blur-[120px] animate-float" />
				<div className="absolute right-[-15%] top-[-10%] h-96 w-96 rounded-full bg-chart-2/40 blur-[140px] animate-orbit" />
				<div className="absolute bottom-[-20%] right-[20%] h-80 w-80 rounded-full bg-chart-1/40 blur-[140px] animate-float" />
			</div>

			<div className="relative z-10 mx-auto flex h-screen max-w-6xl flex-col gap-6 px-6 py-8">
				<header className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
								<Sparkles className="h-5 w-5" />
							</div>
							<div>
								<p className="text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
									Clawion
								</p>
								<h1 className="font-display text-3xl text-foreground">
									Mission Task Board
								</h1>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-3">
							<div className="rounded-full border border-border/60 bg-card/70 px-4 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
								Workspace:{" "}
								<span className="font-mono">{missionsDir ?? "—"}</span>
							</div>
							<ThemeToggle />
						</div>
					</div>
					<div className="flex items-center gap-3 overflow-x-auto pb-1">
						{loadingMissions ? (
							missionSkeletons.map((key) => (
								<div
									key={key}
									className="min-w-[200px] rounded-full border border-border/60 bg-background/70 px-4 py-2"
								>
									<Skeleton className="h-3 w-28" />
								</div>
							))
						) : missions.length === 0 ? (
							<div className="rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs text-muted-foreground">
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
											"rounded-full border border-border/60 bg-background/70 px-4 py-2 text-left text-xs font-medium text-foreground transition",
											isActive && "border-primary/60 bg-primary/10",
										)}
									>
										<span>{item.name}</span>
										<span className="ml-2 text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
											{item.status}
										</span>
									</button>
								);
							})
						)}
					</div>
				</header>

				{error ? (
					<Card className="glass-panel border-destructive/40 bg-destructive/10">
						<CardContent className="flex items-center gap-3 py-4 text-sm text-destructive">
							<AlertTriangle className="h-4 w-4" />
							{error}
						</CardContent>
					</Card>
				) : null}

				<main className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.7fr_0.9fr]">
					<Card className="glass-panel flex h-full flex-col border-border/60 bg-card/80 backdrop-blur">
						<CardHeader className="flex-row items-start justify-between gap-4">
							<div>
								<CardTitle className="font-display text-xl">
									Tasks Board
								</CardTitle>
								<CardDescription>
									From <span className="font-mono">tasks.json</span>
								</CardDescription>
							</div>
							<div className="flex items-center gap-3">
								<Badge
									variant="outline"
									className="rounded-full text-[0.6rem] uppercase tracking-[0.3em]"
								>
									{tasks?.description ?? ""}
								</Badge>
								<div className="text-right">
									<p className="text-xs text-muted-foreground">Completion</p>
									<p className="text-sm font-medium text-foreground">
										{completion}%
									</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className="flex min-h-0 flex-1 flex-col gap-4">
							<div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-xs text-muted-foreground">
								<div className="flex items-center gap-2">
									<ClipboardList className="h-3.5 w-3.5" />
									<span>Tasks: {tasks?.tasks.length ?? 0}</span>
								</div>
								<Progress
									value={completion}
									className="h-2 w-32 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-primary [&>[data-slot=progress-indicator]]:to-chart-2"
								/>
							</div>
							<div className="min-h-0 flex-1 overflow-hidden">
								{loadingMission ? (
									<div className="grid gap-3 md:grid-cols-2">
										{taskSkeletons.map((key) => (
											<div
												key={key}
												className="rounded-xl border border-border/60 bg-background/70 p-4"
											>
												<Skeleton className="h-4 w-32" />
												<Skeleton className="mt-4 h-2 w-full" />
											</div>
										))}
									</div>
								) : tasksColumns.length === 0 ? (
									<div className="rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
										No tasks yet. Create them via CLI.
									</div>
								) : (
									<div className="flex h-full gap-4 overflow-x-auto pb-2">
										{tasksColumns.map((column) => {
											const columnTasks = tasksByColumn.get(column.id) ?? [];
											return (
												<div
													key={column.id}
													className="flex h-full w-[260px] flex-col gap-3"
												>
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
													<div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
														{columnTasks.length === 0 ? (
															<div className="rounded-xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
																No tasks here.
															</div>
														) : (
															columnTasks.map((task) => {
																const isBlocked = task.statusNotes
																	.toLowerCase()
																	.startsWith("blocked:");
																const isActive = task.id === activeTaskId;
																return (
																	<button
																		key={task.id}
																		onClick={() => setActiveTaskId(task.id)}
																		type="button"
																		className={cn(
																			"w-full rounded-xl border border-border/60 bg-background/70 p-3 text-left transition",
																			isActive &&
																				"border-primary/60 bg-primary/10",
																		)}
																	>
																		<p className="text-sm font-medium text-foreground">
																			{task.title}
																		</p>
																		<p className="mt-1 text-xs text-muted-foreground">
																			{task.description}
																		</p>
																		{task.statusNotes ? (
																			<div className="mt-3 text-xs text-muted-foreground">
																				{task.statusNotes}
																			</div>
																		) : null}
																		<div className="mt-3 flex flex-wrap items-center gap-2 text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground">
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
																	</button>
																);
															})
														)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</CardContent>
						<CardFooter className="text-xs text-muted-foreground">
							Status notes are the only blocker surface in this view.
						</CardFooter>
					</Card>

					<div className="flex h-full flex-col gap-6">
						<Card className="glass-panel border-border/60 bg-card/80 backdrop-blur">
							<CardHeader>
								<CardTitle className="font-display text-lg">
									Mission Snapshot
								</CardTitle>
								<CardDescription>
									From <span className="font-mono">mission.json</span> + ROADMAP
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium">
										{mission?.name ?? "No mission selected"}
									</p>
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
								<p className="text-sm text-muted-foreground">
									{mission?.description ??
										"Select a mission to view its summary."}
								</p>
								<div className="rounded-xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
									{loadingMission
										? "Loading ROADMAP.md..."
										: roadmap || "No roadmap yet."}
								</div>
								<div className="text-xs text-muted-foreground">
									Created {formatDate(mission?.createdAt)} · Updated{" "}
									{formatDate(mission?.updatedAt)}
								</div>
							</CardContent>
						</Card>

						<Card className="glass-panel flex min-h-0 flex-1 flex-col border-border/60 bg-card/80 backdrop-blur">
							<CardHeader>
								<CardTitle className="font-display text-lg">
									Focus Panel
								</CardTitle>
								<CardDescription>
									Threads, working memory, and logs.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex min-h-0 flex-1 flex-col">
								<Tabs
									defaultValue="thread"
									className="flex min-h-0 flex-1 flex-col"
								>
									<TabsList variant="line" className="gap-3">
										<TabsTrigger value="thread">Thread</TabsTrigger>
										<TabsTrigger value="worker">Worker</TabsTrigger>
									</TabsList>
									<TabsContent
										value="thread"
										className="mt-4 flex min-h-0 flex-1 flex-col"
									>
										<div className="rounded-xl border border-border/60 bg-background/70 p-3">
											<p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
												Selected task
											</p>
											<p className="mt-2 text-sm font-medium text-foreground">
												{activeTask?.title ?? "None"}
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{activeTask?.description ??
													"Pick a task to view its thread."}
											</p>
										</div>
										<div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
											{loadingThread ? (
												threadSkeletons.map((key) => (
													<div
														key={key}
														className="rounded-xl border border-border/60 bg-background/70 p-3"
													>
														<Skeleton className="h-4 w-32" />
														<Skeleton className="mt-3 h-3 w-40" />
													</div>
												))
											) : thread?.messages.length ? (
												thread.messages.map((message) => (
													<div
														key={message.id}
														className="rounded-xl border border-border/60 bg-background/70 p-3"
													>
														<div className="flex flex-wrap items-center justify-between gap-2">
															<div className="flex items-center gap-2 text-xs text-muted-foreground">
																<MessagesSquare className="h-3.5 w-3.5" />
																<span>{message.authorId}</span>
																<span className="rounded-full border border-border/60 px-2 py-0.5">
																	@{message.mentions}
																</span>
															</div>
															<Badge
																variant="outline"
																className={cn(
																	"rounded-full text-[0.6rem] uppercase tracking-[0.3em]",
																	message.resolved
																		? "border-emerald-400/40 text-emerald-600 dark:text-emerald-300"
																		: "border-amber-400/50 text-amber-600 dark:text-amber-300",
																)}
															>
																{message.resolved ? "Resolved" : "Open"}
															</Badge>
														</div>
														<p className="mt-2 text-sm text-foreground">
															{message.content}
														</p>
														<div className="mt-2 text-xs text-muted-foreground">
															{formatDate(message.createdAt)}
															{message.resolved
																? ` · Resolved by ${message.resolvedBy ?? "—"}`
																: " · Awaiting response"}
														</div>
													</div>
												))
											) : (
												<div className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm text-muted-foreground">
													No messages for this task yet.
												</div>
											)}
										</div>
									</TabsContent>
									<TabsContent
										value="worker"
										className="mt-4 flex min-h-0 flex-1 flex-col"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
												<Users className="h-3.5 w-3.5" />
												Worker roster
											</div>
											<Badge
												variant="outline"
												className="rounded-full text-[0.6rem]"
											>
												{workers?.workers.length ?? 0}
											</Badge>
										</div>
										<div className="mt-3 flex flex-wrap gap-2">
											{loadingMission
												? workerSkeletons.map((key) => (
														<div
															key={key}
															className="rounded-full border border-border/60 bg-background/70 px-3 py-1"
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
																	"rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-foreground transition",
																	isActive && "border-primary/60 bg-primary/10",
																)}
															>
																{worker.displayName}
															</button>
														);
													})}
										</div>
										<div className="mt-4 rounded-xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
											<p className="text-sm font-medium text-foreground">
												{activeWorker?.displayName ?? "No worker selected"}
											</p>
											<p className="mt-1">
												{activeWorker?.roleDescription ??
													"Select a worker to view details."}
											</p>
											<p className="mt-2 text-[0.65rem] uppercase tracking-[0.3em]">
												{activeWorker?.systemRole ?? "—"} ·{" "}
												{activeWorker?.status ?? "—"}
											</p>
										</div>
										<Tabs
											defaultValue="working"
											className="mt-4 flex min-h-0 flex-1 flex-col"
										>
											<TabsList variant="line" className="gap-3">
												<TabsTrigger value="working">Working</TabsTrigger>
												<TabsTrigger value="logs">Logs</TabsTrigger>
											</TabsList>
											<TabsContent
												value="working"
												className="mt-3 min-h-0 flex-1"
											>
												<div className="h-full rounded-xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground whitespace-pre-wrap overflow-y-auto">
													{loadingWorker
														? "Loading working memory..."
														: working || "No working memory file yet."}
												</div>
											</TabsContent>
											<TabsContent value="logs" className="mt-3 min-h-0 flex-1">
												<div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
													{loadingWorker ? (
														logSkeletons.map((key) => (
															<div
																key={key}
																className="rounded-xl border border-border/60 bg-background/70 p-3"
															>
																<Skeleton className="h-3 w-24" />
																<Skeleton className="mt-2 h-3 w-40" />
															</div>
														))
													) : log?.events.length ? (
														log.events.map((event) => (
															<div
																key={event.id}
																className="rounded-xl border border-border/60 bg-background/70 p-3"
															>
																<div className="flex flex-wrap items-center justify-between gap-2">
																	<div className="flex items-center gap-2 text-xs text-muted-foreground">
																		<Activity className="h-3.5 w-3.5" />
																		<span>{event.type}</span>
																	</div>
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Badge
																				variant="outline"
																				className={cn(
																					"rounded-full text-[0.6rem] uppercase tracking-[0.3em]",
																					logLevelTone[event.level],
																				)}
																			>
																				{event.level}
																			</Badge>
																		</TooltipTrigger>
																		<TooltipContent side="top">
																			{formatDate(event.timestamp)}
																		</TooltipContent>
																	</Tooltip>
																</div>
																<p className="mt-2 text-sm text-foreground">
																	{event.message}
																</p>
																<div className="mt-2 text-xs text-muted-foreground">
																	{event.refs?.taskId
																		? `Task ${event.refs.taskId}`
																		: "No task reference"}
																</div>
															</div>
														))
													) : (
														<div className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm text-muted-foreground">
															No logs for this worker yet.
														</div>
													)}
												</div>
											</TabsContent>
										</Tabs>
									</TabsContent>
								</Tabs>
							</CardContent>
							<CardFooter className="text-xs text-muted-foreground">
								Logs are immutable events emitted by the CLI.
							</CardFooter>
						</Card>
					</div>
				</main>
			</div>
		</div>
	);
}
