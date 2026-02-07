import { NextResponse } from "next/server";

import {
	errorResponse,
	type MissionAgentRouteContext,
	NO_CACHE_HEADERS,
} from "@/app/api/_lib/route-helpers";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { listWorkingEvents } from "@/core/workspace/working";

export const runtime = "nodejs";

export async function GET(
	_request: Request,
	context: MissionAgentRouteContext,
) {
	try {
		const { missionId, agentId } = await context.params;
		const missionsDir = resolveMissionsDir();
		await resolveMissionPath(missionsDir, missionId);
		const events = await listWorkingEvents(missionsDir, missionId, agentId);
		return NextResponse.json(
			{ agentId, events },
			{ headers: NO_CACHE_HEADERS },
		);
	} catch (error) {
		return errorResponse(error);
	}
}
