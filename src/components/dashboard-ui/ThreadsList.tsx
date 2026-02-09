"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import type { ThreadSummary } from "@/core/schemas";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ThreadListItem = ThreadSummary & {
	unackedMentionCount: number;
	pendingAckAgentIds: string[];
};

interface ThreadsListProps {
	threads: ThreadListItem[];
	agentMap: Map<string, string>;
	taskMap: Map<string, string>;
	loadingMission: boolean;
	activeMissionId: string | null;
	activeThreadId?: string | null;
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
				const ackSummary =
					thread.unackedMentionCount > 0
						? `Ack pending: ${thread.unackedMentionCount}`
						: "All acknowledged";
				const pendingAckLabel =
					thread.unackedMentionCount > 0
						? thread.pendingAckAgentIds
								.map((id) => agentMap.get(id) ?? id)
								.map((label) => `@${label}`)
								.join(", ")
						: "";

				return (
					<Link
						key={thread.taskId}
						href={`/missions/${activeMissionId}/threads/${thread.taskId}`}
						className={cn(
							"hover-bg-unified block rounded-lg border border-border/70 bg-background px-3 py-2 transition hover:border-primary/40",
							activeThreadId === thread.taskId &&
								"border-border/80 bg-muted/55 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.28)] dark:bg-muted/70",
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
						<p
							className={cn(
								"mt-1 text-[0.62rem]",
								thread.unackedMentionCount > 0
									? "tone-warning-text"
									: "tone-success-text",
							)}
						>
							{ackSummary}
							{pendingAckLabel ? ` · ${pendingAckLabel}` : ""}
						</p>
					</Link>
				);
			})}
		</>
	);
}
