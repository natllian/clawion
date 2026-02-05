import { z } from "zod";
import { idSchema, isoDateSchema, nonEmptyTextSchema } from "./shared";

export const workingEventSchema = z
	.object({
		id: idSchema,
		createdAt: isoDateSchema,
		agentId: idSchema,
		content: nonEmptyTextSchema,
	})
	.strict();

export type WorkingEvent = z.infer<typeof workingEventSchema>;
