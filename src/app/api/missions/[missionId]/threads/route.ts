import { NextResponse } from "next/server";
import { listUnackedTaskMentions } from "@/core/workspace/inbox";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { listThreads } from "@/core/workspace/threads";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ missionId: string }> },
) {
	const { missionId } = await params;
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
				const pendingAckAgentIds = Array.from(
					new Set(pendingMentions.flatMap((item) => item.unackedAgentIds)),
				);
				return {
					...thread,
					unackedMentionCount: pendingMentions.length,
					pendingAckAgentIds,
				};
			}),
		);
		return NextResponse.json(threadsWithAckState);
	} catch {
		return NextResponse.json(
			{ error: "Unable to load threads." },
			{ status: 500 },
		);
	}
}
