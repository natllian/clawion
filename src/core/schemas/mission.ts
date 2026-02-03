import { z } from "zod";
import {
	idSchema,
	isoDateSchema,
	nonEmptyTextSchema,
	schemaVersionSchema,
} from "./shared";

export const missionSchema = z
	.object({
		schemaVersion: schemaVersionSchema,
		id: idSchema,
		name: nonEmptyTextSchema,
		description: nonEmptyTextSchema,
		status: z.enum(["active", "paused", "archived"]),
		createdAt: isoDateSchema,
		updatedAt: isoDateSchema,
	})
	.strict();

export type Mission = z.infer<typeof missionSchema>;
