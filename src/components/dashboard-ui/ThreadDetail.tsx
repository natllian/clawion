"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type {
	Mission,
	ThreadDetail as ThreadDetailData,
	ThreadMessageEvent,
} from "@/core/schemas";
import { missionStatusTone } from "@/lib/status-tones";
import { cn } from "@/lib/utils";
import { MarkdownBlock } from "./MarkdownBlock";

interface ThreadDetailProps {
	missionId: string;
	threadId: string;
	mission: Mission | null;
	agentMap: Map<string, string>;
}

interface ThreadResponse {
	thread: ThreadDetailData;
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
}: ThreadDetailProps) {
	const router = useRouter();
	const [data, setData] = React.useState<ThreadResponse | null>(null);
	const [loading, setLoading] = React.useState(true);

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
	const isTaskBlocked = isBlocked(task.statusNotes);
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
							className="rounded-full border-border/70 bg-muted/60 px-2 py-0.5 text-[0.65rem] font-medium text-foreground/80"
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
									return (
										<div key={message.id} className="relative flex gap-3">
											<Avatar className="z-10 mt-1">
												<AvatarFallback>
													{getInitials(authorLabel)}
												</AvatarFallback>
											</Avatar>
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
