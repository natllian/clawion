"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MissionIndexItem } from "@/core/schemas";
import { getInitials } from "@/lib/format";
import { missionStatusTone } from "@/lib/status-tones";
import { cn } from "@/lib/utils";
import { StatusTag } from "./StatusTag";

interface MissionListProps {
	missions: MissionIndexItem[];
	activeMissionId: string | null;
	loadingMissions: boolean;
	sidebarCollapsed: boolean;
	onDeleteMission?: (missionId: string) => void;
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
	onDeleteMission,
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

	async function handleDelete(
		e: React.MouseEvent,
		missionId: string,
		missionName: string,
	) {
		e.preventDefault();
		e.stopPropagation();
		if (
			!onDeleteMission ||
			!window.confirm(`Delete mission "${missionName}"? This cannot be undone.`)
		) {
			return;
		}
		try {
			const res = await fetch(`/api/missions/${missionId}`, {
				method: "DELETE",
			});
			if (res.ok) {
				onDeleteMission(missionId);
			}
		} catch {
			// Caller can surface error via state if needed
		}
	}

	return (
		<>
			{missions.map((item) => {
				const isActive = item.id === activeMissionId;
				const showDelete = !sidebarCollapsed && onDeleteMission != null;
				const content = (
					<div
						data-testid={`mission-item-${item.id}`}
						className={cn(
							"group hover-bg-unified relative flex w-full items-center gap-2 rounded-xl border border-border/70 bg-background text-xs text-foreground transition hover:border-primary/50",
							sidebarCollapsed ? "flex-row justify-center" : "",
							isActive &&
								"border-border/80 bg-muted/55 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.28)] dark:bg-muted/70",
						)}
					>
						<Link
							href={`/missions/${item.id}`}
							className={cn(
								"flex min-w-0 flex-1 items-center text-left",
								sidebarCollapsed
									? "h-10 w-10 justify-center"
									: "h-12 px-3 py-2",
							)}
						>
							{sidebarCollapsed ? (
								<span className="text-[0.65rem] font-semibold">
									{getInitials(item.name || item.id)}
								</span>
							) : (
								<div className="min-w-0 flex-1">
									<div className="flex items-center justify-between gap-2">
										<span className="truncate pr-1 text-[0.75rem] font-medium leading-none">
											{item.name}
										</span>
										<StatusTag
											tone={missionStatusTone[item.status]}
											className="px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wide transition-opacity duration-150 group-hover:opacity-0"
										>
											{item.status}
										</StatusTag>
									</div>
								</div>
							)}
						</Link>
						{showDelete && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										data-testid={`mission-delete-${item.id}`}
										className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150 hover:text-destructive group-hover:pointer-events-auto group-hover:opacity-100"
										aria-label={`Delete ${item.name}`}
										onClick={(e) =>
											handleDelete(e, item.id, item.name || item.id)
										}
									>
										<Trash2 className="h-3.5 w-3.5 text-destructive/90" />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="right">Delete mission</TooltipContent>
							</Tooltip>
						)}
					</div>
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
