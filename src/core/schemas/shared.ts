import { z } from "zod";

export const schemaVersionSchema = z.literal(1);

/**
 * Safe ID: non-empty, no path separators, no "..", no null bytes.
 */
export const idSchema = z
	.string()
	.min(1)
	.refine((value) => !/[/\\]|\.\.|\0/.test(value), {
		message: "ID must not contain path separators (/\\), '..', or null bytes.",
	});

export const nonEmptyTextSchema = z.string().min(1);

/**
 * Date string in "YYYY-MM-DD HH:mm:ss" local format.
 */
export const isoDateSchema = z
	.string()
	.min(1)
	.regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/, {
		message: "Must be a date string in YYYY-MM-DD HH:mm format.",
	});

export const missionStatusSchema = z.enum([
	"active",
	"paused",
	"archived",
	"completed",
]);
export type MissionStatus = z.infer<typeof missionStatusSchema>;
