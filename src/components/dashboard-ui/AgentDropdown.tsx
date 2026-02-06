"use client";

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
import { AgentSnapshotPanel } from "./AgentSnapshotPanel";

export { WorkingEventItem } from "./AgentSnapshotPanel";

function getInitials(value: string) {
	return value
		.split(/\s+/)
		.map((word) => word.charAt(0))
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

interface AgentDropdownProps {
	agents: AgentsFile | null;
	loadingMission: boolean;
	activeAgentId: string | null;
	onAgentSelect: (id: string) => void;
	working: WorkingEvent[];
	roleDescription: string;
	onRoleDescriptionChange: (value: string) => void;
	onRoleDescriptionSave: (
		agentId: string,
		roleDescription: string,
	) => void | Promise<void>;
	savingRoleDescription: boolean;
	darkSecret: string;
	onDarkSecretChange: (value: string) => void;
	onDarkSecretSave: (agentId: string, content: string) => void | Promise<void>;
	savingDarkSecret: boolean;
	loadingAgent: boolean;
}

export function AgentDropdown({
	agents,
	loadingMission,
	activeAgentId,
	onAgentSelect,
	working,
	roleDescription,
	onRoleDescriptionChange,
	onRoleDescriptionSave,
	savingRoleDescription,
	darkSecret,
	onDarkSecretChange,
	onDarkSecretSave,
	savingDarkSecret,
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
					<DropdownMenu
						key={agent.id}
						modal={false}
						onOpenChange={(open) => {
							if (open) {
								onAgentSelect(agent.id);
							}
						}}
					>
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

						<DropdownMenuContent
							className="z-30 w-[420px] p-3"
							side="right"
							align="start"
							collisionPadding={12}
							sideOffset={10}
						>
							<DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
								Agent Profile
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<AgentSnapshotPanel
								agentLabel={agent.displayName}
								roleDescription={roleDescription}
								onRoleDescriptionChange={onRoleDescriptionChange}
								onRoleDescriptionSave={() =>
									onRoleDescriptionSave(agent.id, roleDescription)
								}
								savingRoleDescription={savingRoleDescription}
								systemRole={agent.systemRole}
								isActive={isActive}
								working={working}
								loadingWorking={loadingAgent}
								darkSecret={darkSecret}
								onDarkSecretChange={onDarkSecretChange}
								onDarkSecretSave={() => onDarkSecretSave(agent.id, darkSecret)}
								savingDarkSecret={savingDarkSecret}
							/>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			})}
		</>
	);
}
