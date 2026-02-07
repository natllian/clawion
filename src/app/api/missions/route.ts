import { NextResponse } from "next/server";

import { errorResponse, NO_CACHE_HEADERS } from "@/app/api/_lib/route-helpers";
import { loadMissionsIndex } from "@/core/workspace/index-file";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const runtime = "nodejs";

export async function GET() {
	try {
		const missionsDir = resolveMissionsDir();
		const index = await loadMissionsIndex(missionsDir);
		return NextResponse.json(
			{ missionsDir, ...index },
			{ headers: NO_CACHE_HEADERS },
		);
	} catch (error) {
		return errorResponse(error);
	}
}
