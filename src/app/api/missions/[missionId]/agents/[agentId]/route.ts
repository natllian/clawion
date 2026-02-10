import { NextResponse } from "next/server";

import {
	errorResponse,
	type MissionAgentRouteContext,
	parseJsonBody,
	validateStringField,
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

		const roleResult = validateStringField(
			result.data.roleDescription,
			"roleDescription",
			{ nonEmpty: true },
		);
		if (roleResult.error) return roleResult.error;

		const missionsDir = resolveMissionsDir();
		const missionDir = await resolveMissionPath(missionsDir, missionId);
		const agent = await setAgentRoleDescription({
			missionDir,
			agentId,
			roleDescription: roleResult.value,
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
