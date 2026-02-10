"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
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
	ThreadDetail as ThreadDetailData,
	ThreadMessageEvent,
	WorkingEvent,
} from "@/core/schemas";
import { formatDate, getInitials } from "@/lib/format";
import type { StatusTone } from "@/lib/status-tones";
import { cn } from "@/lib/utils";
import { AgentSnapshotPanel } from "./AgentSnapshotPanel";
import { MarkdownBlock } from "./MarkdownBlock";
import { StatusTag } from "./StatusTag";

interface ThreadDetailProps {
	missionId: string;
	threadId: string;
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

function isBlocked(statusNotes: string | null): boolean {
	return (statusNotes ?? "").toLowerCase().startsWith("blocked:");
}

function resolveColumnBadgeTone(
	columnId: string,
	columnName?: string | null,
): StatusTone {
	const value = `${columnId} ${columnName ?? ""}`.toLowerCase();

	if (value.includes("block")) {
		return "warning";
	}
	if (value.includes("ongoing") || value.includes("doing")) {
		return "info";
	}
	if (value.includes("complete") || value.includes("done")) {
		return "success";
	}
	return "neutral";
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
	const [snapshotRoleDescription, setSnapshotRoleDescription] =
		React.useState("");
	const [snapshotRoleDraftByAgentId, setSnapshotRoleDraftByAgentId] =
		React.useState<Record<string, string>>({});
	const [snapshotSecret, setSnapshotSecret] = React.useState("");
	const [loadingSnapshot, setLoadingSnapshot] = React.useState(false);
	const [savingSnapshot, setSavingSnapshot] = React.useState(false);
	const [savingSnapshotRole, setSavingSnapshotRole] = React.useState(false);
	const [completingTask, setCompletingTask] = React.useState(false);
	const [acknowledgingAll, setAcknowledgingAll] = React.useState(false);
	const agentsById = React.useMemo(
		() => new Map((agents?.agents ?? []).map((agent) => [agent.id, agent])),
		[agents],
	);

	const loadThread = React.useCallback(
		async (signal?: AbortSignal) => {
			setLoading(true);
			try {
				const response = await fetch(
					`/api/missions/${missionId}/threads/${threadId}`,
					{ cache: "no-store", signal },
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
				if (!signal || !signal.aborted) {
					setLoading(false);
				}
			}
		},
		[missionId, threadId],
	);

	React.useEffect(() => {
		const controller = new AbortController();

		void loadThread(controller.signal);

		return () => {
			controller.abort();
		};
	}, [loadThread]);

	React.useEffect(() => {
		if (!snapshotAgentId) {
			setSnapshotWorking([]);
			setSnapshotRoleDescription("");
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

	React.useEffect(() => {
		if (!snapshotAgentId) return;
		const cachedRole = snapshotRoleDraftByAgentId[snapshotAgentId];
		if (typeof cachedRole === "string") {
			setSnapshotRoleDescription(cachedRole);
			return;
		}
		setSnapshotRoleDescription(
			agentsById.get(snapshotAgentId)?.roleDescription ?? "",
		);
	}, [snapshotAgentId, agentsById, snapshotRoleDraftByAgentId]);

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

	const participants = React.useMemo(() => {
		const set = new Set<string>();
		if (data?.thread.messages) {
			for (const message of data.thread.messages) {
				set.add(message.authorAgentId);
				for (const id of message.mentionsAgentIds) {
					set.add(id);
				}
			}
		}
		return set;
	}, [data?.thread.messages]);

	async function handleSnapshotRoleDescriptionSave(agentId: string) {
		setSavingSnapshotRole(true);
		try {
			const response = await fetch(
				`/api/missions/${missionId}/agents/${agentId}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ roleDescription: snapshotRoleDescription }),
				},
			);
			if (!response.ok) {
				throw new Error("Failed to save role description.");
			}
			setSnapshotRoleDraftByAgentId((current) => ({
				...current,
				[agentId]: snapshotRoleDescription,
			}));
		} finally {
			setSavingSnapshotRole(false);
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
	const pendingAckCount = Object.values(pendingAckByMessageId).reduce(
		(total, agentIds) => total + agentIds.length,
		0,
	);
	const hasPendingAcks = pendingAckCount > 0;
	const isTaskBlocked = isBlocked(task.statusNotes);
	const columnBadgeTone = resolveColumnBadgeTone(task.columnId, column?.name);
	const isTaskCompleted =
		`${task.columnId} ${column?.name ?? ""}`
			.toLowerCase()
			.match(/complete|done/) !== null;
	const assigneeLabel = task.assigneeAgentId
		? `@${agentMap.get(task.assigneeAgentId) ?? task.assigneeAgentId}`
		: "Unassigned";

	function renderAgentSnapshotDropdown(
		agentId: string,
		agentLabel: string,
		trigger: React.ReactNode,
	) {
		const agent = agentsById.get(agentId);
		const isSnapshotActive = snapshotAgentId === agentId;

		return (
			<DropdownMenu
				modal={false}
				onOpenChange={(open) => {
					if (open) {
						setSnapshotAgentId(agentId);
					}
				}}
			>
				<DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
				<DropdownMenuContent
					className="z-30 w-[420px] p-3"
					side="right"
					align="start"
					collisionPadding={12}
					sideOffset={10}
				>
					<DropdownMenuLabel className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-muted-foreground">
						<span>Agent Profile</span>
						<span className="flex items-center gap-2 normal-case tracking-normal">
							<span className="font-medium text-foreground">{agentLabel}</span>
							<span className="rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-foreground/80">
								{agent?.systemRole ?? "—"}
							</span>
						</span>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<AgentSnapshotPanel
						roleDescription={
							isSnapshotActive
								? snapshotRoleDescription
								: (snapshotRoleDraftByAgentId[agentId] ??
									agent?.roleDescription ??
									"")
						}
						onRoleDescriptionChange={setSnapshotRoleDescription}
						onRoleDescriptionSave={() =>
							handleSnapshotRoleDescriptionSave(agentId)
						}
						savingRoleDescription={savingSnapshotRole}
						isActive={isSnapshotActive}
						working={snapshotWorking}
						loadingWorking={loadingSnapshot}
						darkSecret={snapshotSecret}
						onDarkSecretChange={setSnapshotSecret}
						onDarkSecretSave={() => handleSnapshotSecretSave(agentId)}
						savingDarkSecret={savingSnapshot}
					/>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	async function handleCompleteTask() {
		if (completingTask || isTaskCompleted) {
			return;
		}

		setCompletingTask(true);
		try {
			const response = await fetch(
				`/api/missions/${missionId}/tasks/${threadId}/complete`,
				{
					method: "POST",
				},
			);
			if (!response.ok) {
				const payload = (await response.json()) as { error?: string };
				throw new Error(payload.error ?? "Failed to complete task.");
			}
			await loadThread();
		} catch (error) {
			console.error(error);
		} finally {
			setCompletingTask(false);
		}
	}

	async function handleAcknowledgeAll() {
		if (acknowledgingAll || !hasPendingAcks) {
			return;
		}

		setAcknowledgingAll(true);
		try {
			const response = await fetch(
				`/api/missions/${missionId}/threads/${threadId}/ack-all`,
				{
					method: "POST",
				},
			);
			if (!response.ok) {
				const payload = (await response.json()) as { error?: string };
				throw new Error(payload.error ?? "Failed to acknowledge all mentions.");
			}
			await loadThread();
		} catch (error) {
			console.error(error);
		} finally {
			setAcknowledgingAll(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="sm"
					className="hover-bg-unified"
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
						<StatusTag tone={columnBadgeTone}>
							{column?.name ?? task.columnId}
						</StatusTag>
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
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="xs"
								disabled={acknowledgingAll || !hasPendingAcks}
								onClick={handleAcknowledgeAll}
							>
								{acknowledgingAll
									? "Acknowledging..."
									: hasPendingAcks
										? "All acknowledged"
										: "Acknowledged"}
							</Button>
							<Button
								type="button"
								variant="outline"
								size="xs"
								disabled={completingTask || isTaskCompleted}
								onClick={handleCompleteTask}
							>
								{completingTask
									? "Completing..."
									: isTaskCompleted
										? "Completed"
										: "Complete task"}
							</Button>
							<span className="text-xs text-muted-foreground">
								{thread.messages.length} messages
							</span>
						</div>
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
									return (
										<div key={message.id} className="relative flex gap-3">
											{renderAgentSnapshotDropdown(
												message.authorAgentId,
												authorLabel,
												<button
													type="button"
													aria-label={`Open snapshot for ${authorLabel}`}
													className="z-10 mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full p-0 leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
												>
													<Avatar>
														<AvatarFallback>
															{getInitials(authorLabel)}
														</AvatarFallback>
													</Avatar>
												</button>,
											)}
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
													<StatusTag
														tone={hasPendingAck ? "warning" : "success"}
														className="text-[0.6rem]"
													>
														{hasPendingAck
															? `Awaiting ack: ${pendingAckLabels.join(", ")}`
															: "Acknowledged"}
													</StatusTag>
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
							<CardTitle className="text-sm">Assignee</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
							{task.assigneeAgentId ? (
								renderAgentSnapshotDropdown(
									task.assigneeAgentId,
									agentMap.get(task.assigneeAgentId) ?? task.assigneeAgentId,
									<button
										type="button"
										className="hover-bg-unified inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-0.5 text-[0.65rem] font-medium text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
									>
										{assigneeLabel}
									</button>,
								)
							) : (
								<span className="inline-flex items-center rounded-full border border-border/70 border-dashed bg-background px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
									Unassigned
								</span>
							)}
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
								Array.from(participants).map((id) => {
									const participantLabel = agentMap.get(id ?? "") ?? id;

									return (
										<div key={id}>
											{renderAgentSnapshotDropdown(
												id,
												participantLabel,
												<button
													type="button"
													className="hover-bg-unified inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-0.5 text-[0.6rem] font-medium text-foreground/80 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
												>
													{participantLabel}
												</button>,
											)}
										</div>
									);
								})
							)}
						</CardContent>
					</Card>
				</aside>
			</div>
		</div>
	);
}
