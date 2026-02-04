import { NextResponse } from "next/server";

import { getLog } from "@/core/workspace/logs";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const runtime = "nodejs";

type RouteContext = {
	params:
		| Promise<{ missionId: string; agentId: string }>
		| { missionId: string; agentId: string };
};

export async function GET(_request: Request, context: RouteContext) {
	try {
		const { missionId, agentId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const log = await getLog(missionsDir, missionId, agentId);
		return NextResponse.json(log, {
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
