import { join } from "node:path";
import { NextResponse } from "next/server";
import { readJson } from "@/core/fs/json";
import { tasksSchema } from "@/core/schemas";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { getThread } from "@/core/workspace/threads";

export const runtime = "nodejs";

type RouteContext = {
	params:
		| Promise<{ missionId: string; taskId: string }>
		| { missionId: string; taskId: string };
};

export async function GET(_request: Request, context: RouteContext) {
	try {
		const { missionId, taskId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const missionPath = await resolveMissionPath(missionsDir, missionId);

		const [tasksFile, thread] = await Promise.all([
			readJson(join(missionPath, "tasks.json"), tasksSchema),
			getThread(missionsDir, missionId, taskId),
		]);

		const task = tasksFile.tasks.find((entry) => entry.id === taskId);
		if (!task) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		const column = tasksFile.columns.find(
			(entry) => entry.id === task.columnId,
		);

		return NextResponse.json(
			{
				thread,
				task: {
					id: task.id,
					title: task.title,
					description: task.description,
					columnId: task.columnId,
					assigneeId: task.assigneeId,
					statusNotes: task.statusNotes,
					createdAt: task.createdAt,
					updatedAt: task.updatedAt,
				},
				column: column
					? {
							id: column.id,
							name: column.name,
						}
					: null,
			},
			{
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		const status = message.toLowerCase().includes("not found") ? 404 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}
