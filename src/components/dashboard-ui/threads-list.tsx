"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ThreadFile } from "@/core/schemas";
import { threadStatusTone } from "@/lib/status-tones";
import { cn } from "@/lib/utils";

interface ThreadsListProps {
	threads: ThreadFile[];
	workerMap: Map<string, string>;
	loadingMission: boolean;
	activeMissionId: string | null;
	activeThreadId?: string | null;
}

export function ThreadsList({
	threads,
	workerMap,
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
				const creatorName = workerMap.get(thread.creator) ?? thread.creator;

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
								{thread.title}
							</span>
							<Badge
								variant="outline"
								className={cn(
									"shrink-0 rounded-full text-[0.6rem] uppercase tracking-wide",
									threadStatusTone[thread.status],
								)}
							>
								{thread.status}
							</Badge>
						</div>
						<p className="mt-1 line-clamp-1 text-[0.65rem] text-muted-foreground">
							by {creatorName}
						</p>
					</Link>
				);
			})}
		</>
	);
}
