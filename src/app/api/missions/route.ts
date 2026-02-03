import { NextResponse } from "next/server";

import { loadMissionsIndex } from "@/core/workspace/index-file";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const runtime = "nodejs";

export async function GET() {
	try {
		const missionsDir = resolveMissionsDir();
		const index = await loadMissionsIndex(missionsDir);
		return NextResponse.json(
			{ missionsDir, ...index },
			{
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
