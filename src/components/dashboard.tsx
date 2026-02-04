"use client";

import {
	AlertTriangle,
	BookOpen,
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	LayoutGrid,
	Sparkles,
	Users,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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

function getInitials(value: string) {
	return value
		.split(/\s+/)
		.map((word) => word.charAt(0))
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

function MarkdownBlock({ content }: { content: string }) {
	return (
		<ReactMarkdown className="markdown" remarkPlugins={[remarkGfm]}>
			{content}
		</ReactMarkdown>
	);
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
	const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

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

	const roadmapContent = loadingMission
		? "Loading ROADMAP.md..."
		: roadmap.trim() || "No roadmap yet.";
	const workingContent = loadingWorker
		? "Loading working memory..."
		: working.trim() || "No working memory file yet.";

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="flex min-h-screen">
				<aside
					className={cn(
						"flex flex-col border-r border-border/70 bg-card/40 transition-all",
						sidebarCollapsed ? "w-16" : "w-[280px]",
					)}
				>
					<div className="flex items-center justify-between px-4 py-4">
						<div
							className={cn(
								"flex items-center gap-3",
								sidebarCollapsed && "justify-center",
							)}
						>
							<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
								<Sparkles className="h-4 w-4" />
							</div>
							{!sidebarCollapsed ? (
								<div>
									<p className="text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground">
										Clawion
									</p>
									<p className="text-sm font-semibold">Mission Board</p>
								</div>
							) : null}
						</div>
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground"
							onClick={() => setSidebarCollapsed((current) => !current)}
							aria-label="Toggle sidebar"
						>
							{sidebarCollapsed ? (
								<ChevronRight className="h-4 w-4" />
							) : (
								<ChevronLeft className="h-4 w-4" />
							)}
						</Button>
					</div>

					{!sidebarCollapsed ? (
						<div className="px-4 pb-3 text-xs text-muted-foreground">
							Workspace
							<div className="mt-1 rounded-lg border border-border/70 bg-background px-2 py-1 font-mono text-[0.65rem]">
								{missionsDir ?? "—"}
							</div>
						</div>
					) : null}

					<Separator />

					<div className={cn("flex flex-1 flex-col gap-4 px-3 py-4")}>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								{!sidebarCollapsed ? (
									<p className="text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
										Missions
									</p>
								) : null}
							</div>
							<div
								className={cn(
									"flex flex-col gap-2",
									sidebarCollapsed && "items-center",
								)}
							>
								{loadingMissions ? (
									missionSkeletons.map((key) => (
										<div
											key={key}
											className="w-full rounded-lg border border-border/70 bg-background p-3"
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
										const content = (
											<button
												key={item.id}
												onClick={() => setActiveMissionId(item.id)}
												type="button"
												className={cn(
													"w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-left text-xs text-foreground transition hover:border-primary/50 hover:bg-primary/5",
													isActive && "border-primary/60 bg-primary/10",
													sidebarCollapsed &&
														"flex h-10 w-10 items-center justify-center px-0 py-0 text-center",
												)}
											>
												{sidebarCollapsed ? (
													<span className="text-[0.65rem] font-semibold">
														{getInitials(item.name || item.id)}
													</span>
												) : (
													<div>
														<div className="flex items-center justify-between gap-2">
															<span className="font-medium">{item.name}</span>
															<span className="text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
																{item.status}
															</span>
														</div>
														<p className="mt-1 line-clamp-2 text-[0.65rem] text-muted-foreground">
															{item.description}
														</p>
													</div>
												)}
											</button>
										);

										return sidebarCollapsed ? (
											<Tooltip key={item.id}>
												<TooltipTrigger asChild>{content}</TooltipTrigger>
												<TooltipContent side="right">
													{item.name}
												</TooltipContent>
											</Tooltip>
										) : (
											content
										);
									})
								)}
							</div>
						</div>

						{!sidebarCollapsed ? (
							<div className="space-y-2">
								<p className="text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
									Tasks
								</p>
								<div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
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
													<div className="mt-1 flex items-center justify-between text-[0.65rem] text-muted-foreground">
														<span>{task.columnId}</span>
														{activeMissionId ? (
															<Link
																className="text-primary"
																href={`/missions/${activeMissionId}/tasks/${task.id}`}
															>
																Thread
															</Link>
														) : null}
													</div>
												</div>
											);
										})
									) : (
										<div className="rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
											No tasks yet.
										</div>
									)}
								</div>
							</div>
						) : (
							<div className="flex flex-col items-center gap-2 text-[0.65rem] text-muted-foreground">
								<LayoutGrid className="h-4 w-4" />
								<span>{tasks?.tasks.length ?? 0} tasks</span>
							</div>
						)}
					</div>
				</aside>

				<section className="flex min-h-screen flex-1 flex-col">
					<header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 bg-background/95 px-6 py-4">
						<div className="min-w-0">
							<p className="text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground">
								Mission Overview
							</p>
							<div className="flex flex-wrap items-center gap-3">
								<h1 className="font-display text-2xl text-foreground">
									{mission?.name ?? "Select a mission"}
								</h1>
								{mission ? (
									<Badge
										variant="outline"
										className={cn(
											"rounded-full text-[0.6rem] uppercase tracking-[0.3em]",
											missionStatusTone[mission.status],
										)}
									>
										{mission.status}
									</Badge>
								) : null}
							</div>
							<p className="mt-1 max-w-2xl text-xs text-muted-foreground">
								{mission?.description ??
									"Pick a mission to see its tasks and runbook."}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<BookOpen className="h-4 w-4" />
										Snapshot
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-[380px] p-3" sideOffset={8}>
									<DropdownMenuLabel className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
										Mission Snapshot
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<p className="text-sm font-medium">
												{mission?.name ?? "—"}
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
										<p className="text-xs text-muted-foreground">
											{mission?.description ?? "Select a mission."}
										</p>
										<div className="rounded-lg border border-border/70 bg-background p-2">
											<MarkdownBlock content={roadmapContent} />
										</div>
										<p className="text-[0.65rem] text-muted-foreground">
											Created {formatDate(mission?.createdAt)} · Updated{" "}
											{formatDate(mission?.updatedAt)}
										</p>
									</div>
								</DropdownMenuContent>
							</DropdownMenu>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<Users className="h-4 w-4" />
										Workers
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-[420px] p-3" sideOffset={8}>
									<DropdownMenuLabel className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
										Workers & Logs
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<div className="space-y-3">
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
															<Button
																key={worker.id}
																variant={isActive ? "default" : "outline"}
																size="xs"
																onClick={() => setActiveWorkerId(worker.id)}
															>
																{worker.displayName}
															</Button>
														);
													})}
										</div>

										<div className="rounded-lg border border-border/70 bg-background p-3">
											<p className="text-sm font-medium text-foreground">
												{activeWorker?.displayName ?? "No worker selected"}
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{activeWorker?.roleDescription ??
													"Select a worker to view details."}
											</p>
											<p className="mt-2 text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
												{activeWorker?.systemRole ?? "—"} ·{" "}
												{activeWorker?.status ?? "—"}
											</p>
										</div>

										<Tabs defaultValue="working" className="w-full">
											<TabsList variant="line" className="gap-3">
												<TabsTrigger value="working">Working</TabsTrigger>
												<TabsTrigger value="logs">Logs</TabsTrigger>
											</TabsList>
											<TabsContent value="working" className="mt-2">
												<div className="max-h-[160px] overflow-y-auto rounded-lg border border-border/70 bg-background p-2">
													<MarkdownBlock content={workingContent} />
												</div>
											</TabsContent>
											<TabsContent value="logs" className="mt-2">
												<div className="flex max-h-[160px] flex-col gap-2 overflow-y-auto pr-1">
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
														log.events.slice(0, 6).map((event) => (
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
									</div>
								</DropdownMenuContent>
							</DropdownMenu>

							<ThemeToggle />
						</div>
					</header>

					<main className="flex flex-1 flex-col gap-6 px-6 py-6">
						{error ? (
							<Card className="border-destructive/40 bg-destructive/10">
								<CardContent className="flex items-center gap-3 py-3 text-sm text-destructive">
									<AlertTriangle className="h-4 w-4" />
									{error}
								</CardContent>
							</Card>
						) : null}

						<section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
							<div className="flex flex-wrap items-center justify-between gap-4">
								<div>
									<div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
										<LayoutGrid className="h-3.5 w-3.5" />
										Task Board
									</div>
									<p className="mt-2 text-sm text-muted-foreground">
										Dragless, CLI-driven. One column per status.
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
									<ClipboardList className="h-3.5 w-3.5" />
									<span>{tasks?.tasks.length ?? 0} tasks</span>
									<Progress
										value={completion}
										className="h-2 w-24 [&>[data-slot=progress-indicator]]:bg-primary"
									/>
									<span>{completion}%</span>
								</div>
							</div>

							<div className="mt-5">
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
														<p className="text-sm font-semibold text-foreground">
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
																const statusNotes = task.statusNotes ?? "";
																const isBlocked = statusNotes
																	.toLowerCase()
																	.startsWith("blocked:");
																const isActive = task.id === activeTaskId;
																return (
																	<div
																		key={task.id}
																		className={cn(
																			"rounded-xl border border-border/70 bg-background p-3 transition hover:border-primary/40",
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
																				<p className="text-sm font-semibold text-foreground">
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
							</div>
						</section>
					</main>
				</section>
			</div>
		</div>
	);
}
