"use client";

import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Mission } from "@/core/schemas";
import { missionStatusTone } from "@/lib/status-tones";
import { cn } from "@/lib/utils";
import { MarkdownBlock } from "./MarkdownBlock";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

function formatDate(value?: string) {
	if (!value) return "—";
	const normalized = /Z|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) return value;
	return dateFormatter.format(date);
}

interface SnapshotDropdownProps {
	mission: Mission | null;
	roadmapContent: string;
	onRoadmapChange: (value: string) => void;
	onRoadmapSave: () => void | Promise<void>;
	savingRoadmap: boolean;
	loadingMission: boolean;
}

export function SnapshotDropdown({
	mission,
	roadmapContent,
	onRoadmapChange,
	onRoadmapSave,
	savingRoadmap,
	loadingMission,
}: SnapshotDropdownProps) {
	const isEditable = Boolean(mission) && !loadingMission;

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm">
					<BookOpen className="h-4 w-4" />
					Mission Brief
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[380px] p-3" sideOffset={8}>
				<DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
					Mission Brief
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">{mission?.name ?? "—"}</p>
						<Badge
							variant="outline"
							className={cn(
								"rounded-full text-[0.6rem] uppercase tracking-wide",
								mission ? missionStatusTone[mission.status] : "",
							)}
						>
							{mission?.status ?? "—"}
						</Badge>
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between gap-2">
							<p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
								Roadmap
							</p>
							<Button
								type="button"
								size="xs"
								onClick={onRoadmapSave}
								disabled={!isEditable || savingRoadmap}
								className="shrink-0"
							>
								{savingRoadmap ? "Saving..." : "Save"}
							</Button>
						</div>
						<textarea
							value={isEditable ? roadmapContent : ""}
							onChange={(event) => onRoadmapChange(event.target.value)}
							disabled={!isEditable || savingRoadmap}
							placeholder={
								isEditable
									? "Write roadmap markdown..."
									: "Select a mission to edit roadmap."
							}
							className="scrollbar-dropdown h-28 w-full resize-none rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground outline-none ring-ring/50 placeholder:text-muted-foreground focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60"
						/>
						{isEditable ? (
							<div className="rounded-lg border border-border/70 bg-background p-2">
								<p className="mb-2 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
									Live Preview
								</p>
								<MarkdownBlock content={roadmapContent} />
							</div>
						) : null}
					</div>
					<p className="text-[0.65rem] text-muted-foreground">
						Created {formatDate(mission?.createdAt)} · Updated{" "}
						{formatDate(mission?.updatedAt)}
					</p>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
