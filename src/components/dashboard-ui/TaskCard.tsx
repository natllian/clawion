"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TaskItem } from "@/core/schemas";
import { cn } from "@/lib/utils";

interface TaskCardProps {
	task: TaskItem;
	activeTaskId: string | null;
	activeMissionId: string | null;
	agentMap: Map<string, string>;
	hasThread: boolean;
	onTaskSelect: (id: string) => void;
}

export function TaskCard({
	task,
	activeTaskId,
	activeMissionId,
	agentMap,
	hasThread,
	onTaskSelect,
}: TaskCardProps) {
	const statusNotes = task.statusNotes ?? "";
	const isBlocked = statusNotes.toLowerCase().startsWith("blocked:");
	const isActive = task.id === activeTaskId;

	return (
		<div
			className={cn(
				"group relative w-full overflow-hidden rounded-xl border border-border/70 bg-background p-3 shadow-sm transition will-change-transform hover:-translate-y-0.5 hover:shadow-md",
				"before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-border/60 before:content-['']",
				isBlocked && "before:bg-destructive/60",
				isActive && "border-primary/60 bg-primary/10 before:bg-primary/70",
			)}
			data-testid="task-card"
		>
			<div className="flex items-start justify-between gap-2">
				<button
					type="button"
					onClick={() => onTaskSelect(task.id)}
					className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
				>
					<p className="truncate text-sm font-semibold leading-snug text-foreground">
						{task.title}
					</p>
				</button>

				{activeMissionId && hasThread ? (
					<Link
						href={`/missions/${activeMissionId}/threads/${task.id}`}
						className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/70 px-2.5 py-1 text-[0.65rem] font-medium text-foreground/80 shadow-sm transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
					>
						<MessageSquare className="h-3 w-3" />
						Thread
					</Link>
				) : null}
			</div>

			<button
				type="button"
				onClick={() => onTaskSelect(task.id)}
				aria-label={`Select task: ${task.title}`}
				className="mt-1 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
			>
				<div className="relative h-30 overflow-y-auto pr-2 scrollbar-none overscroll-contain">
					<div className="markdown">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{task.description}
						</ReactMarkdown>
					</div>
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-linear-to-t from-background to-transparent opacity-90" />
				</div>

				{statusNotes ? (
					<p className="mt-2 rounded-lg border border-border/50 bg-muted/40 px-2 py-1 text-xs leading-snug text-muted-foreground">
						{statusNotes}
					</p>
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
			</button>
		</div>
	);
}
