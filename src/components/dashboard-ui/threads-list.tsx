"use client";

import Link from "next/link";
import type { TasksFile } from "@/core/schemas";

interface ThreadsListProps {
	tasks: TasksFile | null;
	loadingMission: boolean;
	activeMissionId: string | null;
}

export function ThreadsList({
	tasks,
	loadingMission,
	activeMissionId,
}: ThreadsListProps) {
	if (loadingMission) {
		return (
			<>
				{["task-a", "task-b", "task-c", "task-d"].map((key) => (
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

	if (!tasks?.tasks.length) {
		return (
			<div className="rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
				No threads yet.
			</div>
		);
	}

	return (
		<>
			{tasks.tasks.map((task) => (
				<div
					key={task.id}
					className="rounded-lg border border-border/70 bg-background px-3 py-2"
				>
					<div className="flex items-start justify-between gap-2">
						<Link
							href={`/missions/${activeMissionId}/tasks/${task.id}`}
							className="w-full text-left text-xs font-medium text-foreground"
						>
							{task.title}
						</Link>
						<Link
							href={`/missions/${activeMissionId}/tasks/${task.id}`}
							className="text-[0.65rem] text-primary"
						>
							Thread
						</Link>
					</div>
					<p className="mt-1 text-[0.65rem] text-muted-foreground">
						{task.columnId}
					</p>
				</div>
			))}
		</>
	);
}

import { Skeleton } from "@/components/ui/skeleton";
