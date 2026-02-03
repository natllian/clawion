"use client";

import {
	Activity,
	ArrowDownRight,
	ArrowUpRight,
	Radar,
	Sparkles,
} from "lucide-react";
import * as React from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SummaryItem = {
	label: string;
	value: string;
	delta: string;
	trend: "up" | "down" | "flat";
	note: string;
};

type SignalItem = {
	id: string;
	name: string;
	owner: string;
	score: number;
	change: string;
	status: "watch" | "stabilizing" | "cooling";
};

type ActivityItem = {
	id: string;
	title: string;
	tag: string;
	actor: string;
	time: string;
};

type AgentItem = {
	id: string;
	name: string;
	role: string;
	focus: string;
	status: "online" | "idle";
};

type OverviewData = {
	updatedAt: string;
	summary: SummaryItem[];
	signals: SignalItem[];
	activity: ActivityItem[];
	agents: AgentItem[];
};

const statusTone: Record<SignalItem["status"], string> = {
	watch: "bg-primary/15 text-primary border border-primary/30",
	stabilizing:
		"bg-chart-2/15 text-foreground border border-chart-2/40 dark:text-chart-2",
	cooling: "bg-muted text-muted-foreground border border-border/60",
};

const statusCopy: Record<SignalItem["status"], string> = {
	watch: "Watch",
	stabilizing: "Stabilizing",
	cooling: "Cooling",
};

const summarySkeletons = ["summary-a", "summary-b", "summary-c", "summary-d"];
const agentSkeletons = ["agent-a", "agent-b", "agent-c"];
const signalSkeletons = ["signal-a", "signal-b", "signal-c"];
const activitySkeletons = ["activity-a", "activity-b", "activity-c"];

export function Dashboard() {
	const [data, setData] = React.useState<OverviewData | null>(null);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		const controller = new AbortController();

		async function load() {
			try {
				const response = await fetch("/api/overview", {
					cache: "no-store",
					signal: controller.signal,
				});

				if (!response.ok) {
					throw new Error("Failed to load overview data.");
				}

				const payload = (await response.json()) as OverviewData;
				setData(payload);
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") {
					return;
				}

				setError("We could not refresh the live feed.");
			}
		}

		void load();

		return () => {
			controller.abort();
		};
	}, []);

	const isLoading = !data && !error;
	const summary = data?.summary ?? [];
	const signals = data?.signals ?? [];
	const activity = data?.activity ?? [];
	const agents = data?.agents ?? [];

	return (
		<div className="relative min-h-screen overflow-hidden">
			<div className="pointer-events-none absolute inset-0">
				<div className="aurora absolute inset-0 opacity-90" />
				<div className="magic-grid absolute inset-0 opacity-60" />
				<div className="magic-noise absolute inset-0" />
				<div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-chart-4/40 blur-[120px] animate-float" />
				<div className="absolute right-[-15%] top-[-10%] h-96 w-96 rounded-full bg-chart-2/40 blur-[140px] animate-orbit" />
				<div className="absolute bottom-[-20%] right-[20%] h-80 w-80 rounded-full bg-chart-1/40 blur-[140px] animate-float" />
			</div>

			<div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 lg:py-16">
				<header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div className="flex items-center gap-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
								<Sparkles className="h-5 w-5" />
							</div>
							<div>
								<p className="text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
									Clawion
								</p>
								<h1 className="font-display text-3xl text-foreground">
									Signal Observatory
								</h1>
							</div>
						</div>
						<Badge
							variant="secondary"
							className="w-fit rounded-full bg-secondary/70 px-3 py-1 text-[0.65rem] uppercase tracking-[0.35em]"
						>
							Read-only
						</Badge>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Button size="sm" variant="secondary" className="rounded-full">
							Request Access
						</Button>
						<Button size="sm" variant="outline" className="rounded-full">
							Export Snapshot
						</Button>
						<ThemeToggle />
					</div>
				</header>

				<section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
					<Card className="glass-panel border-border/60 bg-card/80 backdrop-blur">
						<CardHeader className="gap-4">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<CardTitle className="font-display text-2xl">
										Live Constellation
									</CardTitle>
									<CardDescription>
										Streaming telemetry from 12 synthesis clusters.
									</CardDescription>
								</div>
								<Badge
									variant="outline"
									className="rounded-full border-primary/40 text-primary"
								>
									Orbiting
								</Badge>
							</div>
							<Tabs defaultValue="live" className="w-full">
								<div className="flex flex-wrap items-center justify-between gap-4">
									<TabsList variant="line" className="gap-3">
										<TabsTrigger value="live">Live</TabsTrigger>
										<TabsTrigger value="week">7D</TabsTrigger>
										<TabsTrigger value="month">30D</TabsTrigger>
									</TabsList>
									<div className="flex items-center gap-3 text-xs text-muted-foreground">
										<Radar className="h-4 w-4 text-primary" />
										<span>API refresh: 15s</span>
									</div>
								</div>
								<TabsContent value="live" className="mt-6">
									<div className="grid gap-4 md:grid-cols-2">
										{isLoading
											? summarySkeletons.map((key) => (
													<div
														key={key}
														className="rounded-xl border border-border/50 bg-background/70 p-4"
													>
														<Skeleton className="h-4 w-28" />
														<Skeleton className="mt-3 h-8 w-24" />
														<Skeleton className="mt-3 h-3 w-36" />
													</div>
												))
											: summary.map((item) => (
													<div
														key={item.label}
														className="rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm"
													>
														<div className="flex items-center justify-between">
															<p className="text-sm text-muted-foreground">
																{item.label}
															</p>
															<Tooltip>
																<TooltipTrigger asChild>
																	<span
																		className={cn(
																			"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
																			item.trend === "down"
																				? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200"
																				: "bg-primary/15 text-primary",
																		)}
																	>
																		{item.trend === "down" ? (
																			<ArrowDownRight className="h-3 w-3" />
																		) : (
																			<ArrowUpRight className="h-3 w-3" />
																		)}
																		{item.delta}
																	</span>
																</TooltipTrigger>
																<TooltipContent side="bottom">
																	{item.note}
																</TooltipContent>
															</Tooltip>
														</div>
														<p className="mt-3 font-display text-3xl">
															{item.value}
														</p>
														<p className="mt-2 text-xs text-muted-foreground">
															{item.note}
														</p>
													</div>
												))}
									</div>
								</TabsContent>
								<TabsContent
									value="week"
									className="mt-6 text-sm text-muted-foreground"
								>
									Historical snapshots arrive once the archive link is opened.
								</TabsContent>
								<TabsContent
									value="month"
									className="mt-6 text-sm text-muted-foreground"
								>
									Monthly time series will appear after the first sync window.
								</TabsContent>
							</Tabs>
						</CardHeader>
					</Card>

					<Card className="glass-panel border-border/60 bg-card/80 backdrop-blur">
						<CardHeader>
							<CardTitle className="font-display text-xl">
								Autonomous Crew
							</CardTitle>
							<CardDescription>
								Agents calibrated to the live grid.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							{isLoading
								? agentSkeletons.map((key) => (
										<div
											key={key}
											className="flex items-center justify-between gap-4"
										>
											<div className="flex items-center gap-3">
												<Skeleton className="h-10 w-10 rounded-full" />
												<div>
													<Skeleton className="h-4 w-24" />
													<Skeleton className="mt-2 h-3 w-28" />
												</div>
											</div>
											<Skeleton className="h-4 w-16" />
										</div>
									))
								: agents.map((agent) => (
										<div
											key={agent.id}
											className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/70 px-4 py-3"
										>
											<div className="flex items-center gap-3">
												<Avatar className="h-10 w-10 border border-border/60 bg-muted/40">
													<AvatarFallback className="bg-transparent text-sm">
														{agent.name.slice(0, 2)}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="text-sm font-medium">{agent.name}</p>
													<p className="text-xs text-muted-foreground">
														{agent.role}
													</p>
												</div>
											</div>
											<Badge
												variant="outline"
												className={cn(
													"rounded-full px-2 text-[0.65rem] uppercase tracking-[0.22em]",
													agent.status === "online"
														? "border-primary/40 text-primary"
														: "border-border/60 text-muted-foreground",
												)}
											>
												{agent.status}
											</Badge>
										</div>
									))}
						</CardContent>
						<CardFooter className="flex items-center justify-between">
							<p className="text-xs text-muted-foreground">
								Focus sector: {agents[0]?.focus ?? "Synchronizing"}
							</p>
							<Button size="xs" variant="ghost" className="rounded-full">
								Open roster
							</Button>
						</CardFooter>
					</Card>
				</section>

				<section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
					<Card className="glass-panel border-border/60 bg-card/80 backdrop-blur">
						<CardHeader className="flex-row items-center justify-between">
							<div>
								<CardTitle className="font-display text-xl">
									Critical Signals
								</CardTitle>
								<CardDescription>
									Live anomalies ranked by risk.
								</CardDescription>
							</div>
							<Button size="xs" variant="secondary" className="rounded-full">
								Filter
							</Button>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							{isLoading
								? signalSkeletons.map((key) => (
										<div
											key={key}
											className="rounded-xl border border-border/60 bg-background/70 p-4"
										>
											<Skeleton className="h-4 w-40" />
											<Skeleton className="mt-4 h-2 w-full" />
										</div>
									))
								: signals.map((signal) => (
										<div
											key={signal.id}
											className="rounded-xl border border-border/60 bg-background/70 p-4"
										>
											<div className="flex flex-wrap items-center justify-between gap-3">
												<div>
													<p className="text-sm font-medium">{signal.name}</p>
													<p className="text-xs text-muted-foreground">
														Owner: {signal.owner}
													</p>
												</div>
												<div className="flex items-center gap-2">
													<Badge
														variant="outline"
														className={statusTone[signal.status]}
													>
														{statusCopy[signal.status]}
													</Badge>
													<span className="text-xs text-muted-foreground">
														{signal.change}
													</span>
												</div>
											</div>
											<div className="mt-4 flex items-center gap-3">
												<Progress
													value={signal.score}
													className="h-2 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-primary [&>[data-slot=progress-indicator]]:via-chart-2 [&>[data-slot=progress-indicator]]:to-chart-1"
												/>
												<span className="text-xs font-medium">
													{signal.score}
												</span>
											</div>
										</div>
									))}
						</CardContent>
					</Card>

					<Card className="glass-panel border-border/60 bg-card/80 backdrop-blur">
						<CardHeader>
							<CardTitle className="font-display text-xl">
								Signal Activity
							</CardTitle>
							<CardDescription>
								Latest actions applied to the mesh.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							{isLoading
								? activitySkeletons.map((key) => (
										<div key={key}>
											<Skeleton className="h-4 w-full" />
											<Skeleton className="mt-2 h-3 w-24" />
										</div>
									))
								: activity.map((item, index) => (
										<div key={item.id} className="flex flex-col gap-2">
											<div className="flex items-center justify-between gap-3">
												<p className="text-sm">{item.title}</p>
												<Badge
													variant="outline"
													className="rounded-full text-[0.6rem] uppercase tracking-[0.3em]"
												>
													{item.tag}
												</Badge>
											</div>
											<div className="flex items-center justify-between text-xs text-muted-foreground">
												<span>{item.actor}</span>
												<span>{item.time}</span>
											</div>
											{index < activity.length - 1 ? (
												<Separator className="mt-2 bg-border/60" />
											) : null}
										</div>
									))}
						</CardContent>
						<CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
							<span>Latency budget: 140ms</span>
							<span className="flex items-center gap-2">
								<Activity className="h-3.5 w-3.5 text-primary" />
								{data?.updatedAt ? "Synced" : "Connecting"}
							</span>
						</CardFooter>
					</Card>
				</section>

				<section className="grid gap-6 md:grid-cols-2">
					<Card className="glass-panel border-border/60 bg-card/80 backdrop-blur">
						<CardHeader className="flex-row items-center justify-between">
							<div>
								<CardTitle className="font-display text-xl">
									Command Threads
								</CardTitle>
								<CardDescription>Read-only routing directives.</CardDescription>
							</div>
							<Button size="icon-sm" variant="ghost">
								<Sparkles className="h-4 w-4" />
							</Button>
						</CardHeader>
						<CardContent className="space-y-4 text-sm text-muted-foreground">
							<p>
								Your viewers are connected to the API-verified stream. This
								panel is read-only by design, with secure write paths disabled.
							</p>
							<div className="rounded-xl border border-border/60 bg-background/70 p-4">
								<p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
									Policy
								</p>
								<p className="mt-2 text-sm text-foreground">
									No mutation endpoints are active in this environment.
								</p>
								<p className="mt-2 text-xs text-muted-foreground">
									Escalation windows open on request only.
								</p>
							</div>
						</CardContent>
					</Card>

					<Card className="glass-panel border-border/60 bg-card/80 backdrop-blur">
						<CardHeader>
							<CardTitle className="font-display text-xl">
								Signal Integrity
							</CardTitle>
							<CardDescription>
								Rate limiting and gating status.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="rounded-xl border border-border/60 bg-background/70 p-4">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium">Guardrail saturation</p>
									<span className="text-xs text-muted-foreground">68%</span>
								</div>
								<Progress
									value={68}
									className="mt-3 h-2 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-chart-2 [&>[data-slot=progress-indicator]]:to-chart-4"
								/>
							</div>
							<div className="rounded-xl border border-border/60 bg-background/70 p-4">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium">Inference stability</p>
									<span className="text-xs text-muted-foreground">92%</span>
								</div>
								<Progress
									value={92}
									className="mt-3 h-2 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-primary [&>[data-slot=progress-indicator]]:to-chart-1"
								/>
							</div>
						</CardContent>
						<CardFooter className="text-xs text-muted-foreground">
							Signal shields are active and verified.
						</CardFooter>
					</Card>
				</section>
			</div>
		</div>
	);
}
