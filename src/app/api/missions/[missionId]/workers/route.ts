import { NextResponse } from "next/server";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { listWorkers } from "@/core/workspace/workers";

export const runtime = "nodejs";

type RouteContext = {
	params: Promise<{ missionId: string }> | { missionId: string };
};

export async function GET(_request: Request, context: RouteContext) {
	try {
		const { missionId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const missionDir = await resolveMissionPath(missionsDir, missionId);
		const workers = await listWorkers(missionDir);
		return NextResponse.json(workers, {
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
