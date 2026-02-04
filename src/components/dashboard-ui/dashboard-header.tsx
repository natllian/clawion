"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import type { Mission } from "@/core/schemas";
import { cn } from "@/lib/utils";
import { SnapshotDropdown } from "./snapshot-dropdown";

const missionStatusTone: Record<Mission["status"], string> = {
	active: "border-primary/50 text-primary",
	paused: "border-amber-400/50 text-amber-600 dark:text-amber-300",
	archived: "border-border/60 text-muted-foreground",
	completed: "border-emerald-400/40 text-emerald-600 dark:text-emerald-300",
};

interface DashboardHeaderProps {
	mission: Mission | null;
	roadmap: string;
	loadingMission: boolean;
}

export function DashboardHeader({
	mission,
	roadmap,
	loadingMission,
}: DashboardHeaderProps) {
	const roadmapContent = loadingMission
		? "Loading ROADMAP.md..."
		: roadmap.trim() || "No roadmap yet.";

	return (
		<header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 bg-background/95 px-6 py-4">
			<div className="min-w-0">
				<p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
					Mission Overview
				</p>
				<div className="flex flex-wrap items-center gap-3">
					<h1 className="font-display text-2xl text-foreground">
						{mission?.name ?? "Select a mission"}
					</h1>
					{mission && (
						<Badge
							variant="outline"
							className={cn(
								"rounded-full text-[0.6rem] uppercase tracking-wide",
								missionStatusTone[mission.status],
							)}
						>
							{mission.status}
						</Badge>
					)}
				</div>
				<p className="mt-1 max-w-2xl text-xs text-muted-foreground">
					{mission?.description ??
						"Pick a mission to see its tasks and runbook."}
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<SnapshotDropdown mission={mission} roadmapContent={roadmapContent} />
				<ThemeToggle />
			</div>
		</header>
	);
}
