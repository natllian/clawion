import type { Mission, ThreadFile } from "@/core/schemas";

export const missionStatusTone: Record<Mission["status"], string> = {
	active: "border-primary/50 text-primary",
	paused: "border-amber-400/50 text-amber-600 dark:text-amber-300",
	archived: "border-border/60 text-muted-foreground",
	completed: "border-emerald-400/40 text-emerald-600 dark:text-emerald-300",
};

export const threadStatusTone: Record<ThreadFile["status"], string> = {
	open: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
	resolved: "border-border/70 text-muted-foreground",
};
