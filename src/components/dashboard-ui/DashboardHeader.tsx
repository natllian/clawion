"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import type { Mission } from "@/core/schemas";
import { missionStatusTone } from "@/lib/status-tones";
import { cn } from "@/lib/utils";
import { SnapshotDropdown } from "./SnapshotDropdown";

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
		<header className="relative z-40 flex flex-wrap items-start justify-between gap-4 border-b border-border/70 bg-background px-6 py-4">
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
