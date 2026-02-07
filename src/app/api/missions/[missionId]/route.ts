import { NextResponse } from "next/server";

import {
	errorResponse,
	type MissionRouteContext,
	NO_CACHE_HEADERS,
	parseJsonBody,
} from "@/app/api/_lib/route-helpers";
import {
	deleteMission,
	showMission,
	updateMissionRoadmap,
} from "@/core/workspace/missions";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const runtime = "nodejs";

export async function GET(_request: Request, context: MissionRouteContext) {
	try {
		const { missionId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const payload = await showMission(missionsDir, missionId);
		return NextResponse.json(payload, { headers: NO_CACHE_HEADERS });
	} catch (error) {
		return errorResponse(error);
	}
}

export async function PUT(request: Request, context: MissionRouteContext) {
	try {
		const { missionId } = await context.params;
		const result = await parseJsonBody<{ roadmap?: unknown }>(request);
		if (result.error) return result.error;

		const body = result.data;
		if (typeof body.roadmap !== "string") {
			return NextResponse.json(
				{ error: "roadmap must be a string" },
				{ status: 400 },
			);
		}

		const missionsDir = resolveMissionsDir();
		await updateMissionRoadmap({
			missionsDir,
			id: missionId,
			roadmap: body.roadmap,
		});
		const payload = await showMission(missionsDir, missionId);
		return NextResponse.json(payload, { headers: NO_CACHE_HEADERS });
	} catch (error) {
		return errorResponse(error);
	}
}

export async function DELETE(_request: Request, context: MissionRouteContext) {
	try {
		const { missionId } = await context.params;
		const missionsDir = resolveMissionsDir();
		await deleteMission(missionsDir, missionId);
		return new NextResponse(null, { status: 204 });
	} catch (error) {
		return errorResponse(error);
	}
}
