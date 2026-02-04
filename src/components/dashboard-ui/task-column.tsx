"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { TaskItem } from "@/core/schemas";
import { TaskCard } from "./task-card";

interface TaskColumnProps {
	column: { id: string; name: string; order: number };
	tasks: TaskItem[];
	activeTaskId: string | null;
	activeMissionId: string | null;
	workerMap: Map<string, string>;
	onTaskSelect: (id: string) => void;
}

export function TaskColumn({
	column,
	tasks: columnTasks,
	activeTaskId,
	activeMissionId,
	workerMap,
	onTaskSelect,
}: TaskColumnProps) {
	return (
		<div className="w-[280px]">
			<div className="flex items-center justify-between">
				<p className="text-sm font-semibold text-foreground">{column.name}</p>
			</div>

			<div className="mt-3 flex flex-col gap-3">
				{columnTasks.length === 0 ? (
					<div className="rounded-xl border border-border/70 bg-background p-3 text-xs text-muted-foreground">
						No tasks here.
					</div>
				) : (
					columnTasks.map((task) => (
						<TaskCard
							key={task.id}
							task={task}
							activeTaskId={activeTaskId}
							activeMissionId={activeMissionId}
							workerMap={workerMap}
							onTaskSelect={onTaskSelect}
						/>
					))
				)}
			</div>
		</div>
	);
}

interface TaskBoardSkeletonProps {
	taskSkeletons: string[];
}

export function TaskBoardSkeleton({ taskSkeletons }: TaskBoardSkeletonProps) {
	return (
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
	);
}
