"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkingEvent } from "@/core/schemas";
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
	roleDescription: string;
	onRoleDescriptionChange: (value: string) => void;
	onRoleDescriptionSave: () => void | Promise<void>;
	savingRoleDescription: boolean;
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
	roleDescription,
	onRoleDescriptionChange,
	onRoleDescriptionSave,
	savingRoleDescription,
	isActive,
	working,
	loadingWorking,
	darkSecret,
	onDarkSecretChange,
	onDarkSecretSave,
	savingDarkSecret,
}: AgentSnapshotPanelProps) {
	const [isEditingRole, setIsEditingRole] = React.useState(false);
	const [isEditingSecret, setIsEditingSecret] = React.useState(false);

	const canEditRole = isActive && isEditingRole;
	const canEditSecret = isActive && isEditingSecret;

	async function handleSaveRole() {
		await onRoleDescriptionSave();
		setIsEditingRole(false);
	}

	function handleCancelRole() {
		setIsEditingRole(false);
	}

	async function handleSaveSecret() {
		await onDarkSecretSave();
		setIsEditingSecret(false);
	}

	function handleCancelSecret() {
		setIsEditingSecret(false);
	}

	return (
		<div className="space-y-3">
			<div className="mt-2">
				<div className="mb-2 flex items-center justify-between gap-2">
					<p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
						Role Description
					</p>
					<div className="flex items-center gap-2">
						{isEditingRole ? (
							<>
								<Button
									type="button"
									size="xs"
									variant="ghost"
									onClick={handleCancelRole}
									disabled={savingRoleDescription}
								>
									Cancel
								</Button>
								<Button
									type="button"
									size="xs"
									onClick={handleSaveRole}
									disabled={!isActive || savingRoleDescription}
									className="shrink-0"
								>
									{savingRoleDescription ? "Saving..." : "Save"}
								</Button>
							</>
						) : (
							<Button
								type="button"
								size="xs"
								variant="outline"
								onClick={() => setIsEditingRole(true)}
								disabled={!isActive}
							>
								Edit
							</Button>
						)}
					</div>
				</div>
				<textarea
					value={isActive ? roleDescription : ""}
					onChange={(event) => onRoleDescriptionChange(event.target.value)}
					disabled={!canEditRole || savingRoleDescription}
					placeholder={
						isActive
							? "Describe this agent's role and constraints..."
							: "Select an agent to edit role description."
					}
					className="scrollbar-dropdown h-24 w-full resize-none rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground outline-none ring-ring/50 placeholder:text-muted-foreground focus-visible:ring-[3px] disabled:opacity-60"
				/>
			</div>

			<div className="mt-2">
				<div className="mb-2 flex items-center justify-between gap-2">
					<p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
						Dark Secret
					</p>
					<div className="flex items-center gap-2">
						{isEditingSecret ? (
							<>
								<Button
									type="button"
									size="xs"
									variant="ghost"
									onClick={handleCancelSecret}
									disabled={savingDarkSecret}
								>
									Cancel
								</Button>
								<Button
									type="button"
									size="xs"
									onClick={handleSaveSecret}
									disabled={!isActive || savingDarkSecret}
									className="shrink-0"
								>
									{savingDarkSecret ? "Saving..." : "Save"}
								</Button>
							</>
						) : (
							<Button
								type="button"
								size="xs"
								variant="outline"
								onClick={() => setIsEditingSecret(true)}
								disabled={!isActive}
							>
								Edit
							</Button>
						)}
					</div>
				</div>
				<p className="mb-2 text-[0.7rem] text-amber-700">
					Critical and private. It must never be disclosed to other agents.
				</p>
				<textarea
					value={isActive ? darkSecret : ""}
					onChange={(event) => onDarkSecretChange(event.target.value)}
					disabled={!canEditSecret || savingDarkSecret}
					placeholder={
						isActive
							? "Write this agent's dark secret..."
							: "Select an agent to edit dark secret."
					}
					className="scrollbar-dropdown h-24 w-full resize-none rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground outline-none ring-ring/50 placeholder:text-muted-foreground focus-visible:ring-[3px] disabled:opacity-60"
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
