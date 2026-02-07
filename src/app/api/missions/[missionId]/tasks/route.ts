import { NextResponse } from "next/server";

import {
	errorResponse,
	type MissionRouteContext,
	NO_CACHE_HEADERS,
} from "@/app/api/_lib/route-helpers";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { listTasks } from "@/core/workspace/tasks";

export const runtime = "nodejs";

export async function GET(_request: Request, context: MissionRouteContext) {
	try {
		const { missionId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const tasks = await listTasks(missionsDir, missionId);
		return NextResponse.json(tasks, { headers: NO_CACHE_HEADERS });
	} catch (error) {
		return errorResponse(error);
	}
}
