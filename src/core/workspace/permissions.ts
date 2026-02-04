import { join } from "node:path";
import { readJson } from "../fs/json";
import { agentsSchema } from "../schemas";
import { resolveMissionPath } from "./mission";

type ManagerCheckInput = {
	missionsDir: string;
	missionId: string;
	agentId: string;
};

export async function assertManager(input: ManagerCheckInput): Promise<void> {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	const agentsPath = join(missionPath, "agents.json");
	const agentsFile = await readJson(agentsPath, agentsSchema);
	const agent = agentsFile.agents.find((entry) => entry.id === input.agentId);

	if (!agent) {
		throw new Error(`Agent not found: ${input.agentId}`);
	}

	if (agent.systemRole !== "manager") {
		throw new Error(
			`Manager role required. Agent ${input.agentId} is not a manager.`,
		);
	}
}

// Backwards-compat re-export is intentionally omitted. The legacy term should
// not appear outside of systemRole values.
