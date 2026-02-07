import { NextResponse } from "next/server";

import {
	errorResponse,
	type MissionRouteContext,
	NO_CACHE_HEADERS,
} from "@/app/api/_lib/route-helpers";
import { listAgents } from "@/core/workspace/agents";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const runtime = "nodejs";

export async function GET(_request: Request, context: MissionRouteContext) {
	try {
		const { missionId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const missionDir = await resolveMissionPath(missionsDir, missionId);
		const agents = await listAgents(missionDir);
		return NextResponse.json(agents, { headers: NO_CACHE_HEADERS });
	} catch (error) {
		return errorResponse(error);
	}
}
