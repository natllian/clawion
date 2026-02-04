import { z } from "zod";
import {
	idSchema,
	isoDateSchema,
	nonEmptyTextSchema,
	schemaVersionSchema,
} from "./shared";

export const threadStatusSchema = z.enum(["open", "resolved"]);

export const threadMessageSchema = z
	.object({
		id: idSchema,
		createdAt: isoDateSchema,
		authorAgentId: idSchema,
		mentionsAgentId: idSchema,
		content: nonEmptyTextSchema,
		resolved: z.boolean(),
		resolvedAt: isoDateSchema.optional(),
		resolvedByAgentId: idSchema.optional(),
		reopenedAt: isoDateSchema.optional(),
		reopenedByAgentId: idSchema.optional(),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.resolved) {
			if (!value.resolvedAt || !value.resolvedByAgentId) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						"resolvedAt and resolvedByAgentId are required when resolved is true",
				});
			}
			if (value.reopenedAt || value.reopenedByAgentId) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						"reopenedAt/reopenedByAgentId must be absent when resolved is true",
				});
			}
		} else if (value.resolvedAt || value.resolvedByAgentId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"resolvedAt/resolvedByAgentId must be absent when resolved is false",
			});
		} else if (
			(value.reopenedAt && !value.reopenedByAgentId) ||
			(!value.reopenedAt && value.reopenedByAgentId)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"reopenedAt and reopenedByAgentId must either both be present or both be absent",
			});
		}
	});

export const threadSchema = z
	.object({
		schemaVersion: schemaVersionSchema,
		taskId: idSchema,
		title: nonEmptyTextSchema,
		creatorAgentId: idSchema,
		status: threadStatusSchema,
		messages: z.array(threadMessageSchema),
	})
	.strict();

export type ThreadStatus = z.infer<typeof threadStatusSchema>;
export type ThreadMessage = z.infer<typeof threadMessageSchema>;
export type ThreadFile = z.infer<typeof threadSchema>;
