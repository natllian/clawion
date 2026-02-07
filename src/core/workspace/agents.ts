import { join } from "node:path";
import { NotFoundError } from "../errors";
import { readJson, writeJsonAtomic } from "../fs/json";
import { agentSchema, agentsSchema } from "../schemas";
import { DEFAULT_MANAGER_ROLE_DESCRIPTION } from "./roles";

export type AgentInput = {
	id: string;
	displayName: string;
	roleDescription?: string;
	systemRole: "manager" | "worker";
};

export async function addAgent(
	missionDir: string,
	agent: AgentInput,
): Promise<void> {
	const agentsPath = join(missionDir, "agents.json");
	const agentsFile = await readJson(agentsPath, agentsSchema);

	if (agentsFile.agents.some((entry) => entry.id === agent.id)) {
		throw new Error(`Agent already exists: ${agent.id}`);
	}

	const normalizedRoleDescription = normalizeRoleDescription(agent);
	const nextAgent = agentSchema.parse({
		id: agent.id,
		displayName: agent.displayName,
		roleDescription: normalizedRoleDescription,
		systemRole: agent.systemRole,
	});

	const nextFile = agentsSchema.parse({
		...agentsFile,
		agents: [...agentsFile.agents, nextAgent],
	});

	await writeJsonAtomic(agentsPath, nextFile);
}

function normalizeRoleDescription(agent: AgentInput): string {
	const trimmed = agent.roleDescription?.trim();
	if (trimmed && trimmed.length > 0) {
		return trimmed;
	}

	if (agent.systemRole === "manager") {
		return DEFAULT_MANAGER_ROLE_DESCRIPTION;
	}

	throw new Error("roleDescription is required for non-manager agents.");
}

export async function listAgents(missionDir: string) {
	const agentsPath = join(missionDir, "agents.json");
	try {
		return await readJson(agentsPath, agentsSchema);
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			throw new Error(
				`Agents file not found: ${agentsPath}. Is the mission initialized?`,
			);
		}
		throw new Error(
			`Failed to read agents file: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

type AgentRoleDescriptionInput = {
	missionDir: string;
	agentId: string;
	roleDescription: string;
};

export async function setAgentRoleDescription(
	input: AgentRoleDescriptionInput,
) {
	const agentsPath = join(input.missionDir, "agents.json");
	const agentsFile = await readJson(agentsPath, agentsSchema);
	const target = agentsFile.agents.find((agent) => agent.id === input.agentId);
	if (!target) {
		throw new NotFoundError(`Agent not found: ${input.agentId}`);
	}

	const nextAgent = agentSchema.parse({
		...target,
		roleDescription: input.roleDescription,
	});
	const nextFile = agentsSchema.parse({
		...agentsFile,
		agents: agentsFile.agents.map((agent) =>
			agent.id === input.agentId ? nextAgent : agent,
		),
	});
	await writeJsonAtomic(agentsPath, nextFile);
	return nextAgent;
}
