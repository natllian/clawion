"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgentsFile, LogFile } from "@/core/schemas";
import { cn } from "@/lib/utils";

const logLevelTone: Record<"info" | "warn" | "error", string> = {
	info: "border-border/70 text-muted-foreground",
	warn: "border-amber-400/50 text-amber-600 dark:text-amber-300",
	error: "border-destructive/50 text-destructive",
};

const logSkeletons = ["log-a", "log-b", "log-c", "log-d"];

function getInitials(value: string) {
	return value
		.split(/\s+/)
		.map((word) => word.charAt(0))
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

interface LogEventProps {
	event: LogFile["events"][number];
}

export function LogEvent({ event }: LogEventProps) {
	return (
		<div className="rounded-lg border border-border/70 bg-background p-2">
			<div className="flex items-center justify-between gap-2 text-[0.65rem] text-muted-foreground">
				<span>{event.type}</span>
				<Badge
					variant="outline"
					className={cn(
						"rounded-full text-[0.6rem] uppercase tracking-wide",
						logLevelTone[event.level],
					)}
				>
					{event.level}
				</Badge>
			</div>
			<p className="mt-1 text-xs text-foreground">{event.message}</p>
		</div>
	);
}

interface AgentDropdownProps {
	agents: AgentsFile | null;
	loadingMission: boolean;
	activeAgentId: string | null;
	onAgentSelect: (id: string) => void;
	working: string;
	log: LogFile | null;
	loadingAgent: boolean;
}

export function AgentDropdown({
	agents,
	loadingMission,
	activeAgentId,
	onAgentSelect,
	working,
	log,
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
												{agent.roleDescription || "No description provided."}
											</ReactMarkdown>
										</div>
									</div>
									<p className="mt-2 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
										{agent.systemRole ?? "—"} · {agent.status ?? "—"}
									</p>
								</div>

								<Tabs defaultValue="working" className="w-full">
									<TabsList variant="line" className="gap-3">
										<TabsTrigger value="working">Working</TabsTrigger>
										<TabsTrigger value="logs">Logs</TabsTrigger>
									</TabsList>

									<TabsContent value="working" className="mt-2">
										<div className="h-[160px] overflow-y-auto rounded-lg border border-border/70 bg-background p-2 scrollbar-dropdown">
											<MarkdownBlock
												content={
													isActive
														? working.trim() || "No working memory file yet."
														: "Select an agent to load working memory."
												}
											/>
										</div>
									</TabsContent>

									<TabsContent value="logs" className="mt-2">
										<div className="flex h-[160px] flex-col gap-2 overflow-y-auto scrollbar-dropdown pr-1">
											{loadingAgent ? (
												logSkeletons.map((key) => (
													<div
														key={key}
														className="rounded-lg border border-border/70 bg-background p-2"
													>
														<Skeleton className="h-3 w-24" />
													</div>
												))
											) : isActive && log?.events.length ? (
												log.events
													.slice(0, 6)
													.map((event) => (
														<LogEvent key={event.id} event={event} />
													))
											) : (
												<div className="rounded-lg border border-border/70 bg-background p-2 text-xs text-muted-foreground">
													{isActive
														? "No logs for this agent yet."
														: "Select an agent to load logs."}
												</div>
											)}
										</div>
									</TabsContent>
								</Tabs>
							</div>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			})}
		</>
	);
}

import { MarkdownBlock } from "./MarkdownBlock";
