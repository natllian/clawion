"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type {
	AgentsFile,
	Mission,
	ThreadDetail as ThreadDetailData,
	ThreadMessageEvent,
	WorkingEvent,
} from "@/core/schemas";
import { normalizeMarkdownContent } from "@/lib/markdown";
import { missionStatusTone } from "@/lib/status-tones";
import { cn } from "@/lib/utils";
import { MarkdownBlock } from "./MarkdownBlock";

interface ThreadDetailProps {
	missionId: string;
	threadId: string;
	mission: Mission | null;
	agentMap: Map<string, string>;
	agents?: AgentsFile | null;
}

interface ThreadResponse {
	thread: ThreadDetailData;
	pendingAckByMessageId?: Record<string, string[]>;
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

function formatDate(value?: string) {
	if (!value) return "—";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

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

function isBlocked(statusNotes: string | null): boolean {
	return (statusNotes ?? "").toLowerCase().startsWith("blocked:");
}

function resolveColumnBadgeTone(columnId: string, columnName?: string | null) {
	const value = `${columnId} ${columnName ?? ""}`.toLowerCase();

	if (value.includes("block")) {
		return "border-amber-500/40 bg-amber-500/10 text-amber-700";
	}
	if (value.includes("ongoing") || value.includes("doing")) {
		return "border-blue-500/40 bg-blue-500/10 text-blue-700";
	}
	if (value.includes("complete") || value.includes("done")) {
		return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
	}
	return "border-slate-500/40 bg-slate-500/10 text-slate-700";
}

function ThreadSkeleton() {
	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<Skeleton className="h-8 w-3/4" />
				<Skeleton className="h-4 w-1/2" />
			</div>
			<Separator />
			<div className="grid gap-6 lg:grid-cols-[1.8fr_0.7fr]">
				<div className="space-y-4">
					<Skeleton className="h-6 w-32" />
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-32 w-full" />
						))}
					</div>
				</div>
				<div className="space-y-4">
					<Skeleton className="h-40 w-full" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			</div>
		</div>
	);
}

export function ThreadDetail({
	missionId,
	threadId,
	mission,
	agentMap,
	agents = null,
}: ThreadDetailProps) {
	const router = useRouter();
	const [data, setData] = React.useState<ThreadResponse | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [snapshotAgentId, setSnapshotAgentId] = React.useState<string | null>(
		null,
	);
	const [snapshotWorking, setSnapshotWorking] = React.useState<WorkingEvent[]>(
		[],
	);
	const [snapshotSecret, setSnapshotSecret] = React.useState("");
	const [loadingSnapshot, setLoadingSnapshot] = React.useState(false);
	const [savingSnapshot, setSavingSnapshot] = React.useState(false);

	React.useEffect(() => {
		const controller = new AbortController();

		async function loadThread() {
			setLoading(true);
			try {
				const response = await fetch(
					`/api/missions/${missionId}/threads/${threadId}`,
					{ cache: "no-store", signal: controller.signal },
				);
				if (!response.ok) {
					throw new Error("Thread not found");
				}
				const payload = (await response.json()) as ThreadResponse;
				setData(payload);
			} catch (err) {
				if (err instanceof Error && err.name !== "AbortError") {
					console.error("Failed to load thread:", err);
				}
			} finally {
				setLoading(false);
			}
		}

		void loadThread();

		return () => {
			controller.abort();
		};
	}, [missionId, threadId]);

	React.useEffect(() => {
		if (!snapshotAgentId) {
			setSnapshotWorking([]);
			setSnapshotSecret("");
			return;
		}

		const controller = new AbortController();
		setLoadingSnapshot(true);

		async function loadSnapshot() {
			try {
				const [workingResponse, secretResponse] = await Promise.all([
					fetch(`/api/missions/${missionId}/working/${snapshotAgentId}`, {
						cache: "no-store",
						signal: controller.signal,
					}),
					fetch(`/api/missions/${missionId}/secrets/${snapshotAgentId}`, {
						cache: "no-store",
						signal: controller.signal,
					}),
				]);

				if (!workingResponse.ok || !secretResponse.ok) {
					setSnapshotWorking([]);
					setSnapshotSecret("");
					return;
				}

				const workingPayload = (await workingResponse.json()) as {
					events: WorkingEvent[];
				};
				const secretPayload = (await secretResponse.json()) as {
					content: string;
				};

				setSnapshotWorking(workingPayload.events);
				setSnapshotSecret(secretPayload.content);
			} catch {
				setSnapshotWorking([]);
				setSnapshotSecret("");
			} finally {
				setLoadingSnapshot(false);
			}
		}

		void loadSnapshot();

		return () => {
			controller.abort();
		};
	}, [missionId, snapshotAgentId]);

	async function handleSnapshotSecretSave(agentId: string) {
		setSavingSnapshot(true);
		try {
			const response = await fetch(
				`/api/missions/${missionId}/secrets/${agentId}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ content: snapshotSecret }),
				},
			);
			if (!response.ok) {
				throw new Error("Failed to save secret.");
			}
		} finally {
			setSavingSnapshot(false);
		}
	}

	if (loading) {
		return <ThreadSkeleton />;
	}

	if (!data) {
		return (
			<div className="flex h-64 items-center justify-center text-muted-foreground">
				Thread not found
			</div>
		);
	}

	const { thread, task, column } = data;
	const pendingAckByMessageId = data.pendingAckByMessageId ?? {};
	const isTaskBlocked = isBlocked(task.statusNotes);
	const columnBadgeTone = resolveColumnBadgeTone(task.columnId, column?.name);
	const assigneeLabel = task.assigneeAgentId
		? `@${agentMap.get(task.assigneeAgentId) ?? task.assigneeAgentId}`
		: "Unassigned";

	const participants = new Set<string>();
	thread.messages.forEach((message: ThreadMessageEvent) => {
		participants.add(message.authorAgentId);
		message.mentionsAgentIds.forEach((id) => {
			participants.add(id);
		});
	});

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="sm"
					className="hover:bg-muted/50"
					onClick={() => router.push(`/missions/${missionId}`)}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to board
				</Button>
			</div>

			<section className="rounded-2xl border border-border/70 bg-card p-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-3">
							<h1 className="text-2xl font-semibold text-foreground">
								{task.title}
							</h1>
							<span className="text-sm text-muted-foreground">#{task.id}</span>
						</div>
						<div className="mt-2">
							<MarkdownBlock content={task.description} />
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge
							variant="outline"
							className={cn(
								"rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
								columnBadgeTone,
							)}
						>
							{column?.name ?? task.columnId}
						</Badge>
						{isTaskBlocked ? (
							<Badge
								variant="destructive"
								className="rounded-full px-2 py-0.5 text-[0.65rem] font-medium"
							>
								Blocked
							</Badge>
						) : null}
					</div>
				</div>

				<Separator className="my-4" />

				<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
					<span>Created {formatDate(task.createdAt)}</span>
					<span>Updated {formatDate(task.updatedAt)}</span>
					<span
						className={cn(
							"inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-0.5 text-[0.65rem] font-medium text-foreground",
							assigneeLabel === "Unassigned" &&
								"border-dashed text-muted-foreground",
						)}
					>
						{assigneeLabel}
					</span>
				</div>
				{task.statusNotes ? (
					<p className="mt-2 text-sm text-muted-foreground">
						{task.statusNotes}
					</p>
				) : null}
			</section>

			<div className="grid gap-6 lg:grid-cols-[1.8fr_0.7fr]">
				<main className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-semibold">Thread</h2>
						<span className="text-xs text-muted-foreground">
							{thread.messages.length} messages
						</span>
					</div>
					<div className="relative">
						<div className="absolute left-4 top-0 h-full w-px bg-border" />
						<div className="flex flex-col gap-4">
							{thread.messages.length === 0 ? (
								<div className="rounded-xl border border-border/70 bg-card p-4 text-sm text-muted-foreground">
									No thread messages yet.
								</div>
							) : (
								thread.messages.map((message: ThreadMessageEvent) => {
									const authorLabel =
										agentMap.get(message.authorAgentId) ??
										message.authorAgentId;
									const mentionsLabel = message.mentionsAgentIds
										.map((id) => agentMap.get(id) ?? id)
										.map((label) => `@${label}`)
										.join(", ");
									const pendingAckLabels = (
										pendingAckByMessageId[message.id] ?? []
									)
										.map((id) => agentMap.get(id) ?? id)
										.map((label) => `@${label}`);
									const hasPendingAck = pendingAckLabels.length > 0;
									const messageAgent = agents?.agents.find(
										(agent) => agent.id === message.authorAgentId,
									);
									const isSnapshotActive =
										snapshotAgentId === message.authorAgentId;
									return (
										<div key={message.id} className="relative flex gap-3">
											<DropdownMenu modal={false}>
												<DropdownMenuTrigger asChild>
													<button
														type="button"
														aria-label={`Open snapshot for ${authorLabel}`}
														onClick={() =>
															setSnapshotAgentId(message.authorAgentId)
														}
														className="z-10 mt-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
													>
														<Avatar>
															<AvatarFallback>
																{getInitials(authorLabel)}
															</AvatarFallback>
														</Avatar>
													</button>
												</DropdownMenuTrigger>
												<DropdownMenuContent
													className="z-[70] w-[420px] p-3"
													side="right"
													align="start"
													collisionPadding={12}
													sideOffset={10}
												>
													<DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
														Agent Snapshot
													</DropdownMenuLabel>
													<DropdownMenuSeparator />
													<div className="space-y-3">
														<div className="rounded-lg border border-border/70 bg-background p-3">
															<p className="text-sm font-medium text-foreground">
																{authorLabel}
															</p>
															<div className="mt-1 max-h-[120px] overflow-y-auto scrollbar-dropdown">
																<div className="markdown text-xs text-muted-foreground">
																	<ReactMarkdown remarkPlugins={[remarkGfm]}>
																		{normalizeMarkdownContent(
																			messageAgent?.roleDescription ||
																				"No description provided.",
																		)}
																	</ReactMarkdown>
																</div>
															</div>
															<p className="mt-2 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
																{messageAgent?.systemRole ?? "—"}
															</p>
														</div>

														<div className="mt-2">
															<p className="mb-2 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
																Dark Secret
															</p>
															<div className="mb-2 flex items-start justify-between gap-2">
																<p className="text-[0.7rem] text-amber-700">
																	Critical and private. It must never be
																	disclosed to other agents.
																</p>
																<Button
																	type="button"
																	size="xs"
																	onClick={() =>
																		handleSnapshotSecretSave(
																			message.authorAgentId,
																		)
																	}
																	disabled={!isSnapshotActive || savingSnapshot}
																	className="shrink-0"
																>
																	{savingSnapshot ? "Saving..." : "Save Secret"}
																</Button>
															</div>
															<textarea
																value={isSnapshotActive ? snapshotSecret : ""}
																onChange={(event) =>
																	setSnapshotSecret(event.target.value)
																}
																disabled={!isSnapshotActive || savingSnapshot}
																placeholder={
																	isSnapshotActive
																		? "Write this agent's dark secret..."
																		: "Select an agent to edit dark secret."
																}
																className="scrollbar-dropdown h-24 w-full resize-none rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground outline-none ring-ring/50 placeholder:text-muted-foreground focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60"
															/>
														</div>

														<div className="mt-2">
															<p className="mb-2 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
																Working
															</p>
															<div className="flex h-[180px] flex-col gap-2 overflow-y-auto rounded-lg border border-border/70 bg-background p-2 scrollbar-dropdown">
																{loadingSnapshot ? (
																	[1, 2, 3].map((idx) => (
																		<div
																			key={idx}
																			className="rounded-lg border border-border/70 bg-background p-2"
																		>
																			<Skeleton className="h-3 w-24" />
																		</div>
																	))
																) : isSnapshotActive &&
																	snapshotWorking.length ? (
																	snapshotWorking
																		.slice()
																		.reverse()
																		.slice(0, 6)
																		.map((event) => (
																			<div
																				key={event.id}
																				className="rounded-lg border border-border/70 bg-background p-2"
																			>
																				<div className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
																					{formatDate(event.createdAt)}
																				</div>
																				<div className="mt-2 text-xs text-foreground">
																					<MarkdownBlock
																						content={event.content}
																					/>
																				</div>
																			</div>
																		))
																) : (
																	<div className="rounded-lg border border-border/70 bg-background p-2 text-xs text-muted-foreground">
																		{isSnapshotActive
																			? "No working events yet."
																			: "Select an agent to load working events."}
																	</div>
																)}
															</div>
														</div>
													</div>
												</DropdownMenuContent>
											</DropdownMenu>
											<div className="flex-1 rounded-xl border border-border/70 bg-card">
												<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-2 text-xs">
													<div className="flex flex-wrap items-center gap-2">
														<span className="font-medium text-foreground">
															{authorLabel}
														</span>
														<span className="text-muted-foreground">
															to {mentionsLabel}
														</span>
													</div>
													<span
														className={cn(
															"rounded-full border px-2 py-0.5 text-[0.6rem] font-medium",
															hasPendingAck
																? "border-amber-500/40 bg-amber-500/10 text-amber-700"
																: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
														)}
													>
														{hasPendingAck
															? `Awaiting ack: ${pendingAckLabels.join(", ")}`
															: "Acknowledged"}
													</span>
												</div>
												<div className="px-3 py-3">
													<MarkdownBlock content={message.content} />
												</div>
												<div className="border-t border-border/70 px-3 py-2 text-[0.65rem] text-muted-foreground">
													{formatDate(message.createdAt)}
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>
				</main>

				<aside className="space-y-4">
					<Card className="border-border/70 gap-0">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm">Mission</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm text-muted-foreground">
							<p className="font-medium text-foreground">{mission?.name}</p>
							<p>{mission?.description}</p>
							<Badge
								variant="outline"
								className={cn(
									"rounded-full border-border/70 bg-muted/60 px-2 py-0.5 text-[0.65rem] font-medium",
									mission && missionStatusTone[mission.status],
								)}
							>
								{mission?.status}
							</Badge>
						</CardContent>
					</Card>

					<Card className="border-border/70 gap-0">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm">Assignee</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
							<span
								className={cn(
									"inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-0.5 text-[0.65rem] font-medium text-foreground",
									assigneeLabel === "Unassigned" &&
										"border-dashed text-muted-foreground",
								)}
							>
								{assigneeLabel}
							</span>
						</CardContent>
					</Card>

					<Card className="border-border/70 gap-0">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm">Participants</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-2">
							{participants.size === 0 ? (
								<div className="text-xs text-muted-foreground">
									No participants yet.
								</div>
							) : (
								Array.from(participants).map((id) => (
									<Badge
										key={id}
										variant="outline"
										className="rounded-full border-border/70 bg-background px-2 py-0.5 text-[0.6rem] font-medium text-foreground/80"
									>
										{agentMap.get(id ?? "") ?? id}
									</Badge>
								))
							)}
						</CardContent>
					</Card>
				</aside>
			</div>
		</div>
	);
}
