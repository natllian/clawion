import { NextResponse } from "next/server";

import {
	errorResponse,
	type MissionTaskRouteContext,
} from "@/app/api/_lib/route-helpers";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { updateTask } from "@/core/workspace/tasks";

export const runtime = "nodejs";

export async function POST(
	_request: Request,
	context: MissionTaskRouteContext,
) {
	try {
		const { missionId, taskId } = await context.params;
		const missionsDir = resolveMissionsDir();
		await resolveMissionPath(missionsDir, missionId);

		await updateTask({
			missionsDir,
			missionId,
			id: taskId,
			status: "completed",
		});

		return NextResponse.json({ ok: true, taskId });
	} catch (error) {
		return errorResponse(error);
	}
}
