import { z } from "zod";
import { idSchema, isoDateSchema, nonEmptyTextSchema } from "./shared";

export const threadMessageEventSchema = z
	.object({
		type: z.literal("message"),
		id: idSchema,
		createdAt: isoDateSchema,
		authorAgentId: idSchema,
		mentionsAgentIds: z.array(idSchema).min(1),
		content: nonEmptyTextSchema,
	})
	.strict();

export const threadSummarySchema = z
	.object({
		taskId: idSchema,
		messageCount: z.number().int().nonnegative(),
		lastMessageAt: isoDateSchema.optional(),
		lastAuthorAgentId: idSchema.optional(),
		lastMentionsAgentIds: z.array(idSchema),
	})
	.strict();

export type ThreadMessageEvent = z.infer<typeof threadMessageEventSchema>;
export type ThreadSummary = z.infer<typeof threadSummarySchema>;
export type ThreadDetail = {
	taskId: string;
	messages: ThreadMessageEvent[];
};
