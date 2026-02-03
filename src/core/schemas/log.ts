import { z } from "zod";
import {
	idSchema,
	isoDateSchema,
	nonEmptyTextSchema,
	schemaVersionSchema,
} from "./shared";

export const logRefSchema = z
	.object({
		missionId: idSchema.optional(),
		taskId: idSchema.optional(),
		threadId: idSchema.optional(),
	})
	.strict();

export const logEventSchema = z
	.object({
		id: idSchema,
		timestamp: isoDateSchema,
		level: z.enum(["info", "warn", "error"]),
		type: nonEmptyTextSchema,
		message: nonEmptyTextSchema,
		refs: logRefSchema.optional(),
		payload: z.record(z.unknown()).optional(),
	})
	.strict();

export const logSchema = z
	.object({
		schemaVersion: schemaVersionSchema,
		workerId: idSchema,
		events: z.array(logEventSchema),
	})
	.strict();

export type LogEvent = z.infer<typeof logEventSchema>;
export type LogFile = z.infer<typeof logSchema>;
