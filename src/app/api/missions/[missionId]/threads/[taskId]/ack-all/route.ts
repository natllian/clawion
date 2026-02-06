import { NextResponse } from "next/server";
import { acknowledgeAllTaskMentions } from "@/core/workspace/inbox";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const runtime = "nodejs";

type RouteContext = {
	params:
		| Promise<{ missionId: string; taskId: string }>
		| { missionId: string; taskId: string };
};

export async function POST(_request: Request, context: RouteContext) {
	try {
		const { missionId, taskId } = await context.params;
		const missionsDir = resolveMissionsDir();
		await resolveMissionPath(missionsDir, missionId);

		const result = await acknowledgeAllTaskMentions(
			missionsDir,
			missionId,
			taskId,
		);
		return NextResponse.json({
			ok: true,
			taskId,
			...result,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		const status = message.toLowerCase().includes("not found") ? 404 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}
