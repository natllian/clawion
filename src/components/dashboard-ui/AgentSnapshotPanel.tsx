"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkingEvent } from "@/core/schemas";
import { normalizeMarkdownContent } from "@/lib/markdown";
import { MarkdownBlock } from "./MarkdownBlock";

const workingSkeletons = ["working-a", "working-b", "working-c"];

function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

interface AgentSnapshotPanelProps {
	agentLabel: string;
	roleDescription?: string | null;
	systemRole?: string | null;
	isActive: boolean;
	working: WorkingEvent[];
	loadingWorking: boolean;
	darkSecret: string;
	onDarkSecretChange: (value: string) => void;
	onDarkSecretSave: () => void | Promise<void>;
	savingDarkSecret: boolean;
}

interface WorkingEventItemProps {
	event: WorkingEvent;
}

export function WorkingEventItem({ event }: WorkingEventItemProps) {
	return (
		<div className="rounded-lg border border-border/70 bg-background p-2">
			<div className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
				{formatDate(event.createdAt)}
			</div>
			<div className="mt-2 text-xs text-foreground">
				<MarkdownBlock content={event.content} />
			</div>
		</div>
	);
}

export function AgentSnapshotPanel({
	agentLabel,
	roleDescription,
	systemRole,
	isActive,
	working,
	loadingWorking,
	darkSecret,
	onDarkSecretChange,
	onDarkSecretSave,
	savingDarkSecret,
}: AgentSnapshotPanelProps) {
	return (
		<div className="space-y-3">
			<div className="rounded-lg border border-border/70 bg-background p-3">
				<p className="text-sm font-medium text-foreground">{agentLabel}</p>
				<div className="mt-1 max-h-[120px] overflow-y-auto scrollbar-dropdown">
					<div className="markdown text-xs text-muted-foreground">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{normalizeMarkdownContent(
								roleDescription || "No description provided.",
							)}
						</ReactMarkdown>
					</div>
				</div>
				<p className="mt-2 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
					{systemRole ?? "—"}
				</p>
			</div>

			<div className="mt-2">
				<p className="mb-2 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
					Dark Secret
				</p>
				<div className="mb-2 flex items-start justify-between gap-2">
					<p className="text-[0.7rem] text-amber-700">
						Critical and private. It must never be disclosed to other agents.
					</p>
					<Button
						type="button"
						size="xs"
						onClick={onDarkSecretSave}
						disabled={!isActive || savingDarkSecret}
						className="shrink-0"
					>
						{savingDarkSecret ? "Saving..." : "Save Secret"}
					</Button>
				</div>
				<textarea
					value={isActive ? darkSecret : ""}
					onChange={(event) => onDarkSecretChange(event.target.value)}
					disabled={!isActive || savingDarkSecret}
					placeholder={
						isActive
							? "Write this agent's dark secret..."
							: "Select an agent to edit dark secret."
					}
					className="scrollbar-dropdown h-24 w-full resize-none rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground outline-none ring-ring/50 placeholder:text-muted-foreground focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60"
				/>
			</div>

			<div className="mt-2">
				<p className="mb-2 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
					Working
				</p>
				<div className="flex h-[180px] flex-col gap-2 overflow-y-auto rounded-lg border border-border/70 bg-background p-2 scrollbar-dropdown">
					{loadingWorking ? (
						workingSkeletons.map((key) => (
							<div
								key={key}
								className="rounded-lg border border-border/70 bg-background p-2"
							>
								<Skeleton className="h-3 w-24" />
							</div>
						))
					) : isActive && working.length ? (
						working
							.slice()
							.reverse()
							.map((event) => <WorkingEventItem key={event.id} event={event} />)
					) : (
						<div className="rounded-lg border border-border/70 bg-background p-2 text-xs text-muted-foreground">
							{isActive
								? "No working events yet."
								: "Select an agent to load working events."}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
