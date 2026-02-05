"use client";

import { Users } from "lucide-react";
import type * as React from "react";
import type { TaskItem, TasksFile, ThreadSummary } from "@/core/schemas";
import { TaskBoardSkeleton, TaskColumn } from "./TaskColumn";

interface TaskBoardSectionProps {
	children: React.ReactNode;
	loadingMission: boolean;
	tasksColumns: Array<{ id: string; name: string; order: number }>;
	tasksFile: TasksFile | null;
	threads: ThreadSummary[];
	activeTaskId: string | null;
	activeMissionId: string | null;
	agentMap: Map<string, string>;
	onTaskSelect: (id: string) => void;
}

export function TaskBoardSection({
	children,
	loadingMission,
	tasksColumns,
	tasksFile,
	threads,
	activeTaskId,
	activeMissionId,
	agentMap,
	onTaskSelect,
}: TaskBoardSectionProps) {
	const threadTaskIds = new Set<string>(threads.map((thread) => thread.taskId));

	return (
		<section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
			{children}

			<div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
				<div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-wide">
					<Users className="h-3.5 w-3.5" />
					Agents
				</div>
			</div>

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
							const tasksByColumn = new Map<string, TaskItem[]>();
							for (const col of tasksFile.columns) {
								tasksByColumn.set(col.id, []);
							}
							for (const task of tasksFile.tasks) {
								const list = tasksByColumn.get(task.columnId) ?? [];
								list.push(task);
								tasksByColumn.set(task.columnId, list);
							}
							const columnTasks = tasksByColumn.get(column.id) ?? [];

							return (
								<TaskColumn
									key={column.id}
									column={column}
									tasks={columnTasks}
									activeTaskId={activeTaskId}
									activeMissionId={activeMissionId}
									agentMap={agentMap}
									threadTaskIds={threadTaskIds}
									onTaskSelect={onTaskSelect}
								/>
							);
						})}
					</div>
				) : null}
			</div>
		</section>
	);
}
