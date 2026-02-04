"use client";

import type { MissionIndexItem } from "@/core/schemas";
import { cn } from "@/lib/utils";

interface MissionListProps {
	missions: MissionIndexItem[];
	activeMissionId: string | null;
	loadingMissions: boolean;
	onMissionSelect: (id: string) => void;
	sidebarCollapsed: boolean;
}

function MissionListSkeleton({
	sidebarCollapsed,
}: {
	sidebarCollapsed: boolean;
}) {
	return (
		<>
			{["mission-a", "mission-b", "mission-c"].map((key) => (
				<div
					key={key}
					className={cn(
						"w-full rounded-lg border border-border/70 bg-background p-3",
						sidebarCollapsed && "h-10 w-10 p-0",
					)}
				>
					<Skeleton className="h-3 w-24" />
				</div>
			))}
		</>
	);
}

function getInitials(value: string) {
	return value
		.split(/\s+/)
		.map((word) => word.charAt(0))
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

export function MissionList({
	missions,
	activeMissionId,
	loadingMissions,
	onMissionSelect,
	sidebarCollapsed,
}: MissionListProps) {
	if (loadingMissions) {
		return <MissionListSkeleton sidebarCollapsed={sidebarCollapsed} />;
	}

	if (missions.length === 0) {
		return (
			<div className="rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
				No missions yet.
			</div>
		);
	}

	return (
		<>
			{missions.map((item) => {
				const isActive = item.id === activeMissionId;
				const content = (
					<button
						key={item.id}
						onClick={() => onMissionSelect(item.id)}
						type="button"
						className={cn(
							"w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-left text-xs text-foreground transition hover:border-primary/50 hover:bg-primary/5",
							isActive && "border-primary/60 bg-primary/10",
							sidebarCollapsed &&
								"flex h-10 w-10 items-center justify-center px-0 py-0 text-center",
						)}
					>
						{sidebarCollapsed ? (
							<span className="text-[0.65rem] font-semibold">
								{getInitials(item.name || item.id)}
							</span>
						) : (
							<div>
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium">{item.name}</span>
									<span className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
										{item.status}
									</span>
								</div>
								<p className="mt-1 line-clamp-2 text-[0.65rem] text-muted-foreground">
									{item.description}
								</p>
							</div>
						)}
					</button>
				);

				if (sidebarCollapsed) {
					return (
						<Tooltip key={item.id}>
							<TooltipTrigger asChild>{content}</TooltipTrigger>
							<TooltipContent side="right">{item.name}</TooltipContent>
						</Tooltip>
					);
				}

				return content;
			})}
		</>
	);
}

import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
