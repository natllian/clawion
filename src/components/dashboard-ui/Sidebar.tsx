"use client";

import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
	children: React.ReactNode;
	missionsDir: string | null;
	sidebarCollapsed: boolean;
	onToggleCollapse: () => void;
}

export function Sidebar({
	children,
	missionsDir,
	sidebarCollapsed,
	onToggleCollapse,
}: SidebarProps) {
	return (
		<aside
			className={cn(
				"relative z-20 flex shrink-0 flex-col border-r border-border/70 bg-card/40 transition-all",
				sidebarCollapsed ? "w-20 min-w-20" : "w-[280px] min-w-[280px]",
			)}
		>
			<SidebarHeader
				sidebarCollapsed={sidebarCollapsed}
				onToggleCollapse={onToggleCollapse}
			/>

			{!sidebarCollapsed && (
				<div className="px-4 pb-3 text-xs text-muted-foreground">
					Workspace
					<div className="mt-1 rounded-lg border border-border/70 bg-background px-2 py-1 font-mono text-[0.65rem]">
						{missionsDir ?? "—"}
					</div>
				</div>
			)}

			<Separator />

			<div
				className={cn(
					"flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4",
					sidebarCollapsed ? "px-2" : "px-3",
				)}
			>
				{children}
			</div>
		</aside>
	);
}

interface SidebarHeaderProps {
	sidebarCollapsed: boolean;
	onToggleCollapse: () => void;
}

export function SidebarHeader({
	sidebarCollapsed,
	onToggleCollapse,
}: SidebarHeaderProps) {
	if (sidebarCollapsed) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 px-2 py-4">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
					<Sparkles className="h-4 w-4" />
				</div>
				<Button
					variant="ghost"
					size="icon-sm"
					className="shrink-0 text-muted-foreground"
					onClick={onToggleCollapse}
					aria-label="Toggle sidebar"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-4">
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
					<Sparkles className="h-4 w-4" />
				</div>
				<div>
					<p className="text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground">
						Clawion
					</p>
					<p className="text-sm font-semibold">Mission Board</p>
				</div>
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				className="shrink-0 text-muted-foreground"
				onClick={onToggleCollapse}
				aria-label="Toggle sidebar"
			>
				{sidebarCollapsed ? (
					<ChevronRight className="h-4 w-4" />
				) : (
					<ChevronLeft className="h-4 w-4" />
				)}
			</Button>
		</div>
	);
}

import { Separator } from "@/components/ui/separator";
