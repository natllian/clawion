import { NextResponse } from "next/server";

import {
	errorResponse,
	type MissionAgentRouteContext,
	NO_CACHE_HEADERS,
	parseJsonBody,
	validateStringField,
} from "@/app/api/_lib/route-helpers";
import { NotFoundError } from "@/core/errors";
import { listAgents } from "@/core/workspace/agents";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { readAgentSecret, setAgentSecret } from "@/core/workspace/secrets";

export const runtime = "nodejs";

async function assertAgentExists(
	missionsDir: string,
	missionId: string,
	agentId: string,
) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const agentsFile = await listAgents(missionPath);
	if (!agentsFile.agents.some((agent) => agent.id === agentId)) {
		throw new NotFoundError(`Agent not found: ${agentId}`);
	}
}

export async function GET(
	_request: Request,
	context: MissionAgentRouteContext,
) {
	try {
		const { missionId, agentId } = await context.params;
		const missionsDir = resolveMissionsDir();
		await assertAgentExists(missionsDir, missionId, agentId);
		const content = await readAgentSecret(missionsDir, missionId, agentId);
		return NextResponse.json(
			{ agentId, content },
			{ headers: NO_CACHE_HEADERS },
		);
	} catch (error) {
		return errorResponse(error);
	}
}

export async function PUT(request: Request, context: MissionAgentRouteContext) {
	try {
		const { missionId, agentId } = await context.params;
		const missionsDir = resolveMissionsDir();
		await assertAgentExists(missionsDir, missionId, agentId);

		const result = await parseJsonBody<{ content?: unknown }>(request);
		if (result.error) return result.error;

		const contentResult = validateStringField(result.data.content, "content");
		if (contentResult.error) return contentResult.error;

		await setAgentSecret({
			missionsDir,
			missionId,
			agentId,
			content: contentResult.value,
		});

		return NextResponse.json({ agentId, updated: true });
	} catch (error) {
		return errorResponse(error);
	}
}
