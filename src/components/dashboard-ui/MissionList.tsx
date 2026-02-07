"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MissionIndexItem } from "@/core/schemas";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MissionListProps {
	missions: MissionIndexItem[];
	activeMissionId: string | null;
	loadingMissions: boolean;
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
						"rounded-lg border border-border/70 bg-background",
						sidebarCollapsed ? "h-10 w-10 p-0" : "w-full p-3",
					)}
				>
					<Skeleton className="h-3 w-24" />
				</div>
			))}
		</>
	);
}

export function MissionList({
	missions,
	activeMissionId,
	loadingMissions,
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
					<Link
						href={`/missions/${item.id}`}
						className={cn(
							"rounded-lg border border-border/70 bg-background text-xs text-foreground transition hover:border-primary/50 hover:bg-primary/5",
							sidebarCollapsed
								? "flex h-10 w-10 items-center justify-center text-center"
								: "block w-full px-3 py-2 text-left",
							isActive && "border-primary/60 bg-primary/10",
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
							</div>
						)}
					</Link>
				);

				if (sidebarCollapsed) {
					return (
						<Tooltip key={item.id}>
							<TooltipTrigger asChild>{content}</TooltipTrigger>
							<TooltipContent side="right">{item.name}</TooltipContent>
						</Tooltip>
					);
				}

				return <div key={item.id}>{content}</div>;
			})}
		</>
	);
}
