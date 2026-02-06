import { format } from "date-fns";

/**
 * Format a date to local time in "YYYY-MM-DD HH-mm-ss" format.
 * Output: "2026-02-06 17-31-31"
 */
export function formatLocalTime(dateInput: Date | string = new Date()): string {
	const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
	return format(date, "yyyy-MM-dd HH:mm:ss");
}

/**
 * Generate current local time timestamp.
 */
export function nowLocal(): string {
	return formatLocalTime();
}
