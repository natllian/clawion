import { z } from "zod";
import {
	idSchema,
	isoDateSchema,
	nonEmptyTextSchema,
	schemaVersionSchema,
} from "./shared";

export const missionIndexItemSchema = z
	.object({
		id: idSchema,
		name: nonEmptyTextSchema,
		// Backward-compatibility for old index entries; no longer used.
		description: nonEmptyTextSchema.optional(),
		path: nonEmptyTextSchema,
		status: z.enum(["active", "paused", "archived", "completed"]),
		createdAt: isoDateSchema,
		updatedAt: isoDateSchema,
	})
	.strict();

export const missionsIndexSchema = z
	.object({
		schemaVersion: schemaVersionSchema,
		updatedAt: isoDateSchema,
		missions: z.array(missionIndexItemSchema),
	})
	.strict();

export type MissionIndexItem = z.infer<typeof missionIndexItemSchema>;
export type MissionsIndex = z.infer<typeof missionsIndexSchema>;
