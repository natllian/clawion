/**
 * Format a date string to a user-friendly label.
 */
export function formatDate(value?: string): string {
	if (!value) return "—";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

/**
 * Extract initials from a display name (up to 2 chars).
 */
export function getInitials(value: string): string {
	return value
		.split(/\s+/)
		.map((word) => word.charAt(0))
		.join("")
		.slice(0, 2)
		.toUpperCase();
}
