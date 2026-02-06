/**
 * Format a date to local time in ISO 8601 format with timezone offset.
 * Output: "2026-02-06T17:31:31.302+08:00"
 */
export function formatLocalTime(date: Date = new Date()): string {
	const pad = (n: number) => n.toString().padStart(2, "0");
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1);
	const day = pad(date.getDate());
	const hour = pad(date.getHours());
	const minute = pad(date.getMinutes());
	const second = pad(date.getSeconds());
	const millisecond = date.getMilliseconds().toString().padStart(3, "0");

	const tzOffset = date.getTimezoneOffset();
	const sign = tzOffset <= 0 ? "+" : "-";
	const tzHours = Math.floor(Math.abs(tzOffset) / 60)
		.toString()
		.padStart(2, "0");
	const tzMinutes = (Math.abs(tzOffset) % 60).toString().padStart(2, "0");

	return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}${sign}${tzHours}:${tzMinutes}`;
}

/**
 * Generate current local time timestamp.
 */
export function nowLocal(): string {
	return formatLocalTime();
}
