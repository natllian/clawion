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
import { cn } from "@/lib/utils";
import { MarkdownBlock } from "./markdown-block";

const missionStatusTone: Record<Mission["status"], string> = {
	active: "border-primary/50 text-primary",
	paused: "border-amber-400/50 text-amber-600 dark:text-amber-300",
	archived: "border-border/60 text-muted-foreground",
	completed: "border-emerald-400/40 text-emerald-600 dark:text-emerald-300",
};

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
}

export function SnapshotDropdown({
	mission,
	roadmapContent,
}: SnapshotDropdownProps) {
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm">
					<BookOpen className="h-4 w-4" />
					Snapshot
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[380px] p-3" sideOffset={8}>
				<DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
					Mission Snapshot
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
					<p className="text-xs text-muted-foreground">
						{mission?.description ?? "Select a mission."}
					</p>
					<div className="rounded-lg border border-border/70 bg-background p-2">
						<MarkdownBlock content={roadmapContent} />
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
