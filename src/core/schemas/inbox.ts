import { z } from "zod";
import { idSchema, isoDateSchema } from "./shared";

export const inboxAckEventSchema = z
	.object({
		type: z.literal("ack"),
		ackedAt: isoDateSchema,
		missionId: idSchema,
		agentId: idSchema,
		messageId: idSchema,
		taskId: idSchema.optional(),
	})
	.strict();

export type InboxAckEvent = z.infer<typeof inboxAckEventSchema>;
