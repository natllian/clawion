import { NextResponse } from "next/server";

import {
	errorResponse,
	type MissionTaskRouteContext,
} from "@/app/api/_lib/route-helpers";
import {
	appendInboxAck,
	listUnackedTaskMentions,
} from "@/core/workspace/inbox";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const runtime = "nodejs";

export async function POST(
	_request: Request,
	context: MissionTaskRouteContext,
) {
	try {
		const { missionId, taskId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const pendingMentions = await listUnackedTaskMentions(
			missionsDir,
			missionId,
			taskId,
		);

		let ackedCount = 0;
		for (const mention of pendingMentions) {
			for (const agentId of mention.unackedAgentIds) {
				await appendInboxAck({
					missionsDir,
					missionId,
					agentId,
					messageId: mention.messageId,
					taskId,
				});
				ackedCount += 1;
			}
		}

		return NextResponse.json({
			ok: true,
			ackedCount,
			messageCount: pendingMentions.length,
		});
	} catch (error) {
		return errorResponse(error);
	}
}
