"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import type { ThreadSummary } from "@/core/schemas";
import { cn } from "@/lib/utils";

interface ThreadsListProps {
	threads: ThreadSummary[];
	agentMap: Map<string, string>;
	taskMap: Map<string, string>;
	loadingMission: boolean;
	activeMissionId: string | null;
	activeThreadId?: string | null;
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

export function ThreadsList({
	threads,
	agentMap,
	taskMap,
	loadingMission,
	activeMissionId,
	activeThreadId,
}: ThreadsListProps) {
	if (loadingMission) {
		return (
			<>
				{["thread-a", "thread-b", "thread-c", "thread-d"].map((key) => (
					<div
						key={key}
						className="rounded-lg border border-border/70 bg-background p-3"
					>
						<div className="flex items-center justify-between gap-2">
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-4 w-12" />
						</div>
						<Skeleton className="mt-2 h-3 w-20" />
					</div>
				))}
			</>
		);
	}

	if (!threads.length) {
		return (
			<div className="rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
				No threads yet.
			</div>
		);
	}

	return (
		<>
			{threads.map((thread) => {
				const taskTitle = taskMap.get(thread.taskId) ?? thread.taskId;
				const lastAuthor = thread.lastAuthorAgentId
					? (agentMap.get(thread.lastAuthorAgentId) ?? thread.lastAuthorAgentId)
					: "—";
				const lastMessage = thread.lastMessageAt
					? `Last: ${formatDate(thread.lastMessageAt)}`
					: "No messages yet";

				return (
					<Link
						key={thread.taskId}
						href={`/missions/${activeMissionId}/threads/${thread.taskId}`}
						className={cn(
							"block rounded-lg border border-border/70 bg-background px-3 py-2 transition hover:border-primary/40 hover:bg-primary/5",
							activeThreadId === thread.taskId &&
								"border-primary/60 bg-primary/10",
						)}
					>
						<div className="flex items-start justify-between gap-2">
							<span className="line-clamp-1 text-xs font-medium text-foreground">
								{taskTitle}
							</span>
							<span className="shrink-0 rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-foreground/70">
								{thread.messageCount}
							</span>
						</div>
						<p className="mt-1 line-clamp-1 text-[0.65rem] text-muted-foreground">
							by {lastAuthor} · {lastMessage}
						</p>
					</Link>
				);
			})}
		</>
	);
}
