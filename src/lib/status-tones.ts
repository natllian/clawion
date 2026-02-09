import type { Mission } from "@/core/schemas";

export const missionStatusTone: Record<Mission["status"], string> = {
	active: "border-primary/50 text-primary",
	paused: "tone-warning-border tone-warning-text",
	archived: "border-border/60 text-muted-foreground",
	completed: "tone-success-border tone-success-text",
};
