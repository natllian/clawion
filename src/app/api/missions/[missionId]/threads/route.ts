import { NextResponse } from "next/server";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { listThreads } from "@/core/workspace/threads";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ missionId: string }> },
) {
	const { missionId } = await params;
	const { searchParams } = new URL(request.url);
	const missionsDir = resolveMissionsDir(searchParams.get("missionsDir"));

	try {
		const threads = await listThreads(missionsDir, missionId);
		return NextResponse.json(threads);
	} catch {
		return NextResponse.json(
			{ error: "Unable to load threads." },
			{ status: 500 },
		);
	}
}
