"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgentsFile, WorkingEvent } from "@/core/schemas";
import { normalizeMarkdownContent } from "@/lib/markdown";
import { MarkdownBlock } from "./MarkdownBlock";

const workingSkeletons = ["working-a", "working-b", "working-c"];

function getInitials(value: string) {
	return value
		.split(/\s+/)
		.map((word) => word.charAt(0))
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

interface WorkingEventProps {
	event: WorkingEvent;
}

export function WorkingEventItem({ event }: WorkingEventProps) {
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

interface AgentDropdownProps {
	agents: AgentsFile | null;
	loadingMission: boolean;
	activeAgentId: string | null;
	onAgentSelect: (id: string) => void;
	working: WorkingEvent[];
	loadingAgent: boolean;
}

export function AgentDropdown({
	agents,
	loadingMission,
	activeAgentId,
	onAgentSelect,
	working,
	loadingAgent,
}: AgentDropdownProps) {
	const skeletons = ["agent-a", "agent-b", "agent-c"];

	if (loadingMission) {
		return (
			<>
				{skeletons.map((key) => (
					<div
						key={key}
						className="flex items-center gap-2 rounded-full border border-border/70 bg-background px-2 py-1"
					>
						<Skeleton className="h-4 w-4 rounded-full" />
						<Skeleton className="h-3 w-12" />
					</div>
				))}
			</>
		);
	}

	if (!agents?.agents.length) {
		return <span>No agents yet.</span>;
	}

	return (
		<>
			{agents.agents.map((agent) => {
				const isActive = agent.id === activeAgentId;

				return (
					<DropdownMenu key={agent.id} modal={false}>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								onClick={() => onAgentSelect(agent.id)}
								className="flex items-center gap-2 rounded-full border border-border/70 bg-background px-2 py-1 text-xs text-foreground transition hover:border-primary/40 hover:bg-primary/5"
							>
								<Avatar size="sm">
									<AvatarFallback>
										{getInitials(agent.displayName)}
									</AvatarFallback>
								</Avatar>
								<span>{agent.displayName}</span>
							</button>
						</DropdownMenuTrigger>

						<DropdownMenuContent className="w-[420px] p-3" sideOffset={8}>
							<DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
								Agent Snapshot
							</DropdownMenuLabel>
							<DropdownMenuSeparator />

							<div className="space-y-3">
								<div className="rounded-lg border border-border/70 bg-background p-3">
									<p className="text-sm font-medium text-foreground">
										{agent.displayName}
									</p>
									<div className="mt-1 max-h-[120px] overflow-y-auto scrollbar-dropdown">
										<div className="markdown text-xs text-muted-foreground">
											<ReactMarkdown remarkPlugins={[remarkGfm]}>
												{normalizeMarkdownContent(
													agent.roleDescription || "No description provided.",
												)}
											</ReactMarkdown>
										</div>
									</div>
									<p className="mt-2 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
										{agent.systemRole ?? "—"}
									</p>
								</div>

								<div className="mt-2">
									<p className="mb-2 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
										Working
									</p>
									<div className="flex h-[180px] flex-col gap-2 overflow-y-auto rounded-lg border border-border/70 bg-background p-2 scrollbar-dropdown">
										{loadingAgent ? (
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
												.slice(0, 6)
												.map((event) => (
													<WorkingEventItem key={event.id} event={event} />
												))
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
						</DropdownMenuContent>
					</DropdownMenu>
				);
			})}
		</>
	);
}
