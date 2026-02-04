"use client";

import { ClipboardList, LayoutGrid, Users } from "lucide-react";
import type * as React from "react";
import { Progress } from "@/components/ui/progress";
import type { TaskItem, TasksFile } from "@/core/schemas";
import { TaskBoardSkeleton, TaskColumn } from "./task-column";

interface ProgressStatsProps {
	tasks: TasksFile | null;
	completion: number;
}

export function ProgressStats({ tasks, completion }: ProgressStatsProps) {
	return (
		<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
			<ClipboardList className="h-3.5 w-3.5" />
			<span>{tasks?.tasks.length ?? 0} tasks</span>
			<Progress
				value={completion}
				className="h-2 w-24 *:data-[slot=progress-indicator]:bg-primary"
			/>
			<span>{completion}%</span>
		</div>
	);
}

interface TaskBoardHeaderProps {
	children?: React.ReactNode;
}

export function TaskBoardHeader({ children }: TaskBoardHeaderProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-4">
			<div>
				<div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
					<LayoutGrid className="h-3.5 w-3.5" />
					Task Board
				</div>
				<p className="mt-2 text-sm text-muted-foreground">
					Dragless, CLI-driven. One column per status.
				</p>
			</div>
			{children}
		</div>
	);
}

interface TaskBoardSectionProps {
	children: React.ReactNode;
	loadingMission: boolean;
	tasksColumns: Array<{ id: string; name: string; order: number }>;
	tasksFile: TasksFile | null;
	activeTaskId: string | null;
	activeMissionId: string | null;
	workerMap: Map<string, string>;
	onTaskSelect: (id: string) => void;
}

export function TaskBoardSection({
	children,
	loadingMission,
	tasksColumns,
	tasksFile,
	activeTaskId,
	activeMissionId,
	workerMap,
	onTaskSelect,
}: TaskBoardSectionProps) {
	return (
		<section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
			{children}

			<div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
				<div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-wide">
					<Users className="h-3.5 w-3.5" />
					Workers
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
									workerMap={workerMap}
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
