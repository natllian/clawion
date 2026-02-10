"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TaskItem } from "@/core/schemas";
import { normalizeMarkdownContent } from "@/lib/markdown";
import { isBlockedStatusNotes } from "@/lib/task-state";
import { cn } from "@/lib/utils";
import { pillClass, pillMutedClass } from "./pill-tokens";

interface TaskCardProps {
	task: TaskItem;
	activeMissionId: string | null;
	agentMap: Map<string, string>;
	hasThread: boolean;
}

export function TaskCard({
	task,
	activeMissionId,
	agentMap,
	hasThread,
}: TaskCardProps) {
	const statusNotes = task.statusNotes ?? "";
	const isBlocked = isBlockedStatusNotes(task.statusNotes);
	const normalizedDescription = normalizeMarkdownContent(task.description);

	return (
		<div
			className={cn(
				"group relative w-full overflow-hidden rounded-xl border border-border/70 bg-background p-3 shadow-sm transition will-change-transform hover:-translate-y-px hover:shadow-[0_10px_16px_-12px_rgba(0,0,0,0.35),0_2px_4px_-2px_rgba(0,0,0,0.2)]",
				"dark:border-border/90 dark:bg-card dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_14px_20px_-16px_rgba(0,0,0,0.82),0_2px_6px_-4px_rgba(0,0,0,0.56)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_24px_-16px_rgba(0,0,0,0.86),0_4px_8px_-4px_rgba(0,0,0,0.58)]",
				"after:pointer-events-none after:absolute after:inset-px after:rounded-[11px] after:bg-linear-to-b after:from-transparent after:to-transparent dark:after:from-white/4.5 dark:after:to-transparent",
				"before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-border/60 before:content-[''] dark:before:bg-transparent",
				isBlocked && "before:bg-destructive/60 dark:before:bg-destructive/55",
			)}
			data-testid="task-card"
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1 text-left">
					<p className="truncate text-sm font-semibold leading-snug text-foreground">
						{task.title}
					</p>
				</div>

				{activeMissionId && hasThread ? (
					<Link
						href={`/missions/${activeMissionId}/threads/${task.id}`}
						className="hover-bg-unified shrink-0 inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/70 px-2.5 py-1 text-[0.65rem] font-medium text-foreground/80 shadow-sm transition-colors duration-200 hover:border-primary/55 hover:text-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/90 dark:bg-muted/45 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:hover:border-primary/50 dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_16px_-12px_rgba(0,0,0,0.7)]"
					>
						<MessageSquare className="h-3 w-3" />
						Thread
					</Link>
				) : null}
			</div>

			<div className="mt-1 w-full text-left">
				<div className="relative max-h-30 overflow-y-auto pr-2 scrollbar-none overscroll-contain">
					<div className="markdown markdown-compact">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{normalizedDescription}
						</ReactMarkdown>
					</div>
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
							pillClass,
							"text-[0.6rem]",
							!task.assigneeAgentId && pillMutedClass,
						)}
					>
						{task.assigneeAgentId
							? `@${agentMap.get(task.assigneeAgentId) ?? task.assigneeAgentId}`
							: "Unassigned"}
					</span>
				</div>
			</div>
		</div>
	);
}
