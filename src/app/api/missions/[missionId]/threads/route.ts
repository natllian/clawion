import { NextResponse } from "next/server";

import {
	errorResponse,
	type MissionRouteContext,
	NO_CACHE_HEADERS,
} from "@/app/api/_lib/route-helpers";
import {
	collectPendingAckAgentIds,
	listUnackedTaskMentions,
} from "@/core/workspace/inbox";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { listThreads } from "@/core/workspace/threads";

export const runtime = "nodejs";

export async function GET(_request: Request, context: MissionRouteContext) {
	const { missionId } = await context.params;
	const missionsDir = resolveMissionsDir();

	try {
		const threads = await listThreads(missionsDir, missionId);
		const threadsWithAckState = await Promise.all(
			threads.map(async (thread) => {
				const pendingMentions = await listUnackedTaskMentions(
					missionsDir,
					missionId,
					thread.taskId,
				);
				const pendingAckAgentIds = collectPendingAckAgentIds(pendingMentions);
				return {
					...thread,
					unackedMentionCount: pendingMentions.length,
					pendingAckAgentIds,
				};
			}),
		);
		return NextResponse.json(threadsWithAckState, {
			headers: NO_CACHE_HEADERS,
		});
	} catch (error) {
		return errorResponse(error);
	}
}
