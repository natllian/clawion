import { z } from "zod";
import {
	idSchema,
	isoDateSchema,
	missionStatusSchema,
	nonEmptyTextSchema,
	schemaVersionSchema,
} from "./shared";

export const missionSchema = z
	.object({
		schemaVersion: schemaVersionSchema,
		id: idSchema,
		name: nonEmptyTextSchema,
		status: missionStatusSchema,
		createdAt: isoDateSchema,
		updatedAt: isoDateSchema,
	})
	.strict();

export type Mission = z.infer<typeof missionSchema>;
