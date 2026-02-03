import { z } from "zod";
import { idSchema, nonEmptyTextSchema, schemaVersionSchema } from "./shared";

export const workerSchema = z
	.object({
		id: idSchema,
		displayName: nonEmptyTextSchema,
		roleDescription: nonEmptyTextSchema,
		systemRole: z.enum(["manager", "worker"]),
		status: z.enum(["active", "paused"]),
	})
	.strict();

export const workersSchema = z
	.object({
		schemaVersion: schemaVersionSchema,
		workers: z.array(workerSchema),
	})
	.strict()
	.superRefine((value, ctx) => {
		const hasManager = value.workers.some(
			(worker) => worker.systemRole === "manager",
		);

		if (!hasManager) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "At least one manager is required in workers.json",
			});
		}
	});

export type Worker = z.infer<typeof workerSchema>;
export type WorkersFile = z.infer<typeof workersSchema>;
