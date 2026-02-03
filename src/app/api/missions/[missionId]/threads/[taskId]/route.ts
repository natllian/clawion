import { NextResponse } from "next/server";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { getThread } from "@/core/workspace/threads";

export const runtime = "nodejs";

type RouteContext = {
	params:
		| Promise<{ missionId: string; taskId: string }>
		| { missionId: string; taskId: string };
};

export async function GET(_request: Request, context: RouteContext) {
	try {
		const { missionId, taskId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const thread = await getThread(missionsDir, missionId, taskId);
		return NextResponse.json(thread, {
			headers: {
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		const status = message.toLowerCase().includes("not found") ? 404 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}
