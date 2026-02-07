import { z } from "zod";
import {
	idSchema,
	isoDateSchema,
	missionStatusSchema,
	nonEmptyTextSchema,
	schemaVersionSchema,
} from "./shared";

export const missionIndexItemSchema = z
	.object({
		id: idSchema,
		name: nonEmptyTextSchema,
		path: nonEmptyTextSchema,
		status: missionStatusSchema,
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
