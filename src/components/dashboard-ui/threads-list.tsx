"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ThreadFile } from "@/core/schemas";
import { cn } from "@/lib/utils";

const threadStatusTone: Record<ThreadFile["status"], string> = {
	open: "border-blue-400/50 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30",
	resolved:
		"border-emerald-400/40 text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30",
};

interface ThreadsListProps {
	threads: ThreadFile[];
	workerMap: Map<string, string>;
	loadingMission: boolean;
	activeMissionId: string | null;
}

export function ThreadsList({
	threads,
	workerMap,
	loadingMission,
	activeMissionId,
}: ThreadsListProps) {
	if (loadingMission) {
		return (
			<>
				{["thread-a", "thread-b", "thread-c", "thread-d"].map((key) => (
					<div
						key={key}
						className="rounded-lg border border-border/70 bg-background p-3"
					>
						<Skeleton className="h-3 w-28" />
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
					<div
						key={thread.taskId}
						className="rounded-lg border border-border/70 bg-background px-3 py-2"
					>
						<div className="flex items-start justify-between gap-2">
							<Link
								href={`/missions/${activeMissionId}/tasks/${thread.taskId}`}
								className="w-full text-left text-xs font-medium text-foreground"
							>
								{thread.title}
							</Link>
							<Badge
								variant="outline"
								className={cn(
									"rounded-full text-[0.6rem] uppercase tracking-wide",
									threadStatusTone[thread.status],
								)}
							>
								{thread.status}
							</Badge>
						</div>
						<p className="mt-1 text-[0.65rem] text-muted-foreground">
							by {creatorName}
						</p>
					</div>
				);
			})}
		</>
	);
}
