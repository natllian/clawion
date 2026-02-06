import { NextResponse } from "next/server";
import { setAgentRoleDescription } from "@/core/workspace/agents";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const runtime = "nodejs";

type RouteContext = {
	params:
		| Promise<{ missionId: string; agentId: string }>
		| { missionId: string; agentId: string };
};

export async function PUT(request: Request, context: RouteContext) {
	try {
		const { missionId, agentId } = await context.params;
		const body = (await request.json()) as { roleDescription?: unknown };
		if (typeof body.roleDescription !== "string") {
			return NextResponse.json(
				{ error: "roleDescription must be a string" },
				{ status: 400 },
			);
		}
		if (body.roleDescription.length < 1) {
			return NextResponse.json(
				{ error: "roleDescription must not be empty" },
				{ status: 400 },
			);
		}

		const missionsDir = resolveMissionsDir();
		const missionDir = await resolveMissionPath(missionsDir, missionId);
		const agent = await setAgentRoleDescription({
			missionDir,
			agentId,
			roleDescription: body.roleDescription,
		});
		return NextResponse.json({
			agentId: agent.id,
			roleDescription: agent.roleDescription,
			updated: true,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		const status = message.toLowerCase().includes("not found") ? 404 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}
