import { NextResponse } from "next/server";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { updateTask } from "@/core/workspace/tasks";

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

		await updateTask({
			missionsDir,
			missionId,
			id: taskId,
			status: "completed",
		});

		return NextResponse.json({ ok: true, taskId });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		const status = message.toLowerCase().includes("not found") ? 404 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}
