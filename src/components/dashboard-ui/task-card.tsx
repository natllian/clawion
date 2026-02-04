"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import type { TaskItem } from "@/core/schemas";
import { cn } from "@/lib/utils";

interface TaskCardProps {
	task: TaskItem;
	activeTaskId: string | null;
	activeMissionId: string | null;
	agentMap: Map<string, string>;
	onTaskSelect: (id: string) => void;
}

export function TaskCard({
	task,
	activeTaskId,
	activeMissionId,
	agentMap,
	onTaskSelect,
}: TaskCardProps) {
	const statusNotes = task.statusNotes ?? "";
	const isBlocked = statusNotes.toLowerCase().startsWith("blocked:");
	const isActive = task.id === activeTaskId;

	return (
		<div
			className={cn(
				"relative rounded-xl border border-border/70 bg-background p-3 transition hover:border-primary/40",
				isActive && "border-primary/60 bg-primary/10",
			)}
		>
			<button
				type="button"
				onClick={() => onTaskSelect(task.id)}
				className="w-full text-left pr-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
			>
				<p className="text-sm font-semibold text-foreground">{task.title}</p>
				<p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
			</button>

			{activeMissionId ? (
				<Link
					href={`/missions/${activeMissionId}/threads/${task.id}`}
					className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/70 px-2.5 py-1 text-[0.65rem] font-medium text-foreground/80 shadow-sm transition hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
				>
					<MessageSquare className="h-3 w-3" />
					Thread
				</Link>
			) : null}

			{statusNotes ? (
				<p className="mt-2 text-xs text-muted-foreground">{statusNotes}</p>
			) : null}

			<div className="mt-3 flex flex-wrap items-center gap-2 text-[0.65rem] text-muted-foreground">
				<span className="rounded-full border border-border/70 bg-muted/70 px-2 py-0.5 text-[0.6rem] font-medium text-foreground/80">
					#{task.id}
				</span>
				{isBlocked ? (
					<span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[0.6rem] font-medium text-destructive">
						Blocked
					</span>
				) : null}
			</div>

			<div className="mt-2 flex items-center gap-2 text-[0.65rem] text-muted-foreground">
				<span
					className={cn(
						"inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-0.5 text-[0.6rem] font-medium text-foreground",
						!task.assigneeAgentId && "border-dashed text-muted-foreground",
					)}
				>
					{task.assigneeAgentId
						? `@${agentMap.get(task.assigneeAgentId) ?? task.assigneeAgentId}`
						: "Unassigned"}
				</span>
			</div>
		</div>
	);
}
