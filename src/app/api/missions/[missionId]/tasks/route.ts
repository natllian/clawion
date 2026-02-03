import { NextResponse } from "next/server";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { listTasks } from "@/core/workspace/tasks";

export const runtime = "nodejs";

type RouteContext = {
	params: Promise<{ missionId: string }> | { missionId: string };
};

export async function GET(_request: Request, context: RouteContext) {
	try {
		const { missionId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const tasks = await listTasks(missionsDir, missionId);
		return NextResponse.json(tasks, {
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
