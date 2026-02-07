"use client";

import type * as React from "react";
import { useMemo } from "react";
import type { TaskItem, TasksFile, ThreadSummary } from "@/core/schemas";
import { TaskBoardSkeleton, TaskColumn } from "./TaskColumn";

interface TaskBoardSectionProps {
	children: React.ReactNode;
	loadingMission: boolean;
	tasksColumns: Array<{ id: string; name: string; order: number }>;
	tasksFile: TasksFile | null;
	threads: ThreadSummary[];
	activeMissionId: string | null;
	agentMap: Map<string, string>;
}

export function TaskBoardSection({
	children,
	loadingMission,
	tasksColumns,
	tasksFile,
	threads,
	activeMissionId,
	agentMap,
}: TaskBoardSectionProps) {
	const threadTaskIds = useMemo(
		() => new Set<string>(threads.map((thread) => thread.taskId)),
		[threads],
	);

	const tasksByColumn = useMemo(() => {
		const map = new Map<string, TaskItem[]>();
		if (!tasksFile) return map;
		for (const col of tasksFile.columns) {
			map.set(col.id, []);
		}
		for (const task of tasksFile.tasks) {
			const list = map.get(task.columnId) ?? [];
			list.push(task);
			map.set(task.columnId, list);
		}
		return map;
	}, [tasksFile]);

	return (
		<section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
			{children}

			<div className="mt-5">
				{loadingMission ? (
					<TaskBoardSkeleton taskSkeletons={["task-a", "task-b", "task-c"]} />
				) : !tasksColumns.length ? (
					<div className="rounded-xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
						No tasks yet. Create them via CLI.
					</div>
				) : tasksFile ? (
					<div className="flex gap-4 overflow-x-auto pb-2">
						{tasksColumns.map((column) => {
							const columnTasks = tasksByColumn.get(column.id) ?? [];

							return (
								<TaskColumn
									key={column.id}
									column={column}
									tasks={columnTasks}
									activeMissionId={activeMissionId}
									agentMap={agentMap}
									threadTaskIds={threadTaskIds}
								/>
							);
						})}
					</div>
				) : null}
			</div>
		</section>
	);
}
