import { NextResponse } from "next/server";
import { listAgents } from "@/core/workspace/agents";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { readAgentSecret, setAgentSecret } from "@/core/workspace/secrets";

export const runtime = "nodejs";

type RouteContext = {
	params:
		| Promise<{ missionId: string; agentId: string }>
		| { missionId: string; agentId: string };
};

async function assertAgentExists(
	missionsDir: string,
	missionId: string,
	agentId: string,
) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const agentsFile = await listAgents(missionPath);
	if (!agentsFile.agents.some((agent) => agent.id === agentId)) {
		throw new Error(`Agent not found: ${agentId}`);
	}
}

export async function GET(_request: Request, context: RouteContext) {
	try {
		const { missionId, agentId } = await context.params;
		const missionsDir = resolveMissionsDir();
		await assertAgentExists(missionsDir, missionId, agentId);
		const content = await readAgentSecret(missionsDir, missionId, agentId);
		return NextResponse.json(
			{ agentId, content },
			{
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		const status = message.toLowerCase().includes("not found") ? 404 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}

export async function PUT(request: Request, context: RouteContext) {
	try {
		const { missionId, agentId } = await context.params;
		const missionsDir = resolveMissionsDir();
		await assertAgentExists(missionsDir, missionId, agentId);

		const body = (await request.json()) as { content?: unknown };
		if (typeof body.content !== "string") {
			return NextResponse.json(
				{ error: "content must be a string" },
				{ status: 400 },
			);
		}

		await setAgentSecret({
			missionsDir,
			missionId,
			agentId,
			content: body.content,
		});

		return NextResponse.json({ agentId, updated: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		const status = message.toLowerCase().includes("not found") ? 404 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}
