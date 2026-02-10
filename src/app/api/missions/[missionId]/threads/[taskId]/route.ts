import { join } from "node:path";
import { NextResponse } from "next/server";

import {
	errorResponse,
	type MissionTaskRouteContext,
	NO_CACHE_HEADERS,
} from "@/app/api/_lib/route-helpers";
import { readJson } from "@/core/fs/json";
import { tasksSchema } from "@/core/schemas";
import {
	groupPendingAckByMessageId,
	listUnackedTaskMentions,
} from "@/core/workspace/inbox";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { getThread } from "@/core/workspace/threads";

export const runtime = "nodejs";

export async function GET(_request: Request, context: MissionTaskRouteContext) {
	try {
		const { missionId, taskId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const missionPath = await resolveMissionPath(missionsDir, missionId);

		const [tasksFile, thread, pendingMentions] = await Promise.all([
			readJson(join(missionPath, "tasks.json"), tasksSchema),
			getThread(missionsDir, missionId, taskId),
			listUnackedTaskMentions(missionsDir, missionId, taskId),
		]);

		const task = tasksFile.tasks.find((entry) => entry.id === taskId);
		if (!task) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		const column = tasksFile.columns.find(
			(entry) => entry.id === task.columnId,
		);

		const pendingAckByMessageId = groupPendingAckByMessageId(pendingMentions);

		return NextResponse.json(
			{
				thread,
				pendingAckByMessageId,
				task: {
					id: task.id,
					title: task.title,
					description: task.description,
					columnId: task.columnId,
					assigneeAgentId: task.assigneeAgentId,
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
			{ headers: NO_CACHE_HEADERS },
		);
	} catch (error) {
		return errorResponse(error);
	}
}
