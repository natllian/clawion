import { NextResponse } from "next/server";

import { getLog } from "@/core/workspace/logs";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const runtime = "nodejs";

type RouteContext = {
	params:
		| Promise<{ missionId: string; workerId: string }>
		| { missionId: string; workerId: string };
};

export async function GET(_request: Request, context: RouteContext) {
	try {
		const { missionId, workerId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const log = await getLog(missionsDir, missionId, workerId);
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
