import { z } from "zod";
import { idSchema, nonEmptyTextSchema, schemaVersionSchema } from "./shared";

export const agentSchema = z
	.object({
		id: idSchema,
		displayName: nonEmptyTextSchema,
		roleDescription: nonEmptyTextSchema,
		systemRole: z.enum(["manager", "worker"]),
	})
	.strict();

export const agentsSchema = z
	.object({
		schemaVersion: schemaVersionSchema,
		agents: z.array(agentSchema),
	})
	.strict();

export type Agent = z.infer<typeof agentSchema>;
export type AgentsFile = z.infer<typeof agentsSchema>;
