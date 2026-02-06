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
		// Backward-compatibility for old mission.json files; no longer used.
		description: nonEmptyTextSchema.optional(),
		status: z.enum(["active", "paused", "archived", "completed"]),
		createdAt: isoDateSchema,
		updatedAt: isoDateSchema,
	})
	.strict();

export type Mission = z.infer<typeof missionSchema>;
