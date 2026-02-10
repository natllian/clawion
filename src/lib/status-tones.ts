import type { Mission } from "@/core/schemas";

export type StatusTone = "primary" | "warning" | "info" | "success" | "neutral";

export const statusTagBaseClass =
	"rounded-full border px-2 py-0.5 text-[0.65rem] font-medium";

export const statusToneClass: Record<StatusTone, string> = {
	primary: "border-primary/35 bg-primary/10 text-primary",
	warning: "tone-warning-soft tone-warning-border",
	info: "tone-info-soft",
	success: "tone-success-soft tone-success-border",
	neutral: "tone-neutral-soft",
};

export const missionStatusTone: Record<Mission["status"], StatusTone> = {
	active: "primary",
	paused: "warning",
	archived: "neutral",
	completed: "success",
};
