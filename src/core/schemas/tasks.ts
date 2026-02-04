import { z } from "zod";
import {
	idSchema,
	isoDateSchema,
	nonEmptyTextSchema,
	schemaVersionSchema,
} from "./shared";

export const taskColumnSchema = z
	.object({
		id: idSchema,
		name: nonEmptyTextSchema,
		order: z.number().int(),
	})
	.strict();

export const taskItemSchema = z
	.object({
		id: idSchema,
		title: nonEmptyTextSchema,
		description: nonEmptyTextSchema,
		columnId: idSchema,
		statusNotes: z.string(),
		assigneeAgentId: idSchema.optional(),
		createdAt: isoDateSchema,
		updatedAt: isoDateSchema,
	})
	.strict();

export const tasksSchema = z
	.object({
		schemaVersion: schemaVersionSchema,
		description: nonEmptyTextSchema,
		columns: z.array(taskColumnSchema),
		tasks: z.array(taskItemSchema),
	})
	.strict();

export type TaskColumn = z.infer<typeof taskColumnSchema>;
export type TaskItem = z.infer<typeof taskItemSchema>;
export type TasksFile = z.infer<typeof tasksSchema>;
