import { z } from "zod";
import {
	idSchema,
	isoDateSchema,
	nonEmptyTextSchema,
	schemaVersionSchema,
} from "./shared";

export const threadMessageSchema = z
	.object({
		id: idSchema,
		createdAt: isoDateSchema,
		authorId: idSchema,
		mentions: idSchema,
		content: nonEmptyTextSchema,
		resolved: z.boolean(),
		resolvedAt: isoDateSchema.optional(),
		resolvedBy: idSchema.optional(),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.resolved) {
			if (!value.resolvedAt || !value.resolvedBy) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						"resolvedAt and resolvedBy are required when resolved is true",
				});
			}
		} else if (value.resolvedAt || value.resolvedBy) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "resolvedAt/resolvedBy must be absent when resolved is false",
			});
		}
	});

export const threadSchema = z
	.object({
		schemaVersion: schemaVersionSchema,
		taskId: idSchema,
		messages: z.array(threadMessageSchema),
	})
	.strict();

export type ThreadMessage = z.infer<typeof threadMessageSchema>;
export type ThreadFile = z.infer<typeof threadSchema>;
