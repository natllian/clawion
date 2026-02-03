import { NextResponse } from "next/server";

import { showMission } from "@/core/workspace/missions";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const runtime = "nodejs";

type RouteContext = {
	params: Promise<{ missionId: string }> | { missionId: string };
};

export async function GET(_request: Request, context: RouteContext) {
	try {
		const { missionId } = await context.params;
		const missionsDir = resolveMissionsDir();
		const payload = await showMission(missionsDir, missionId);
		return NextResponse.json(payload, {
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
