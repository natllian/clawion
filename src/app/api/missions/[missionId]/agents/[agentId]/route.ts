import { NextResponse } from "next/server";

import {
	errorResponse,
	type MissionAgentRouteContext,
	parseJsonBody,
} from "@/app/api/_lib/route-helpers";
import { setAgentRoleDescription } from "@/core/workspace/agents";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const runtime = "nodejs";

export async function PUT(request: Request, context: MissionAgentRouteContext) {
	try {
		const { missionId, agentId } = await context.params;
		const result = await parseJsonBody<{ roleDescription?: unknown }>(request);
		if (result.error) return result.error;

		const body = result.data;
		if (typeof body.roleDescription !== "string") {
			return NextResponse.json(
				{ error: "roleDescription must be a string" },
				{ status: 400 },
			);
		}
		if (body.roleDescription.length < 1) {
			return NextResponse.json(
				{ error: "roleDescription must not be empty" },
				{ status: 400 },
			);
		}

		const missionsDir = resolveMissionsDir();
		const missionDir = await resolveMissionPath(missionsDir, missionId);
		const agent = await setAgentRoleDescription({
			missionDir,
			agentId,
			roleDescription: body.roleDescription,
		});
		return NextResponse.json({
			agentId: agent.id,
			roleDescription: agent.roleDescription,
			updated: true,
		});
	} catch (error) {
		return errorResponse(error);
	}
}
