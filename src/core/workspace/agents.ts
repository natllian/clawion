import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readJson, writeJsonAtomic } from "../fs/json";
import { pathExists } from "../fs/util";
import { agentSchema, agentsSchema } from "../schemas";
import { DEFAULT_MANAGER_ROLE_DESCRIPTION } from "./roles";

export type AgentInput = {
	id: string;
	displayName: string;
	roleDescription?: string;
	systemRole: "manager" | "worker";
	status?: "active" | "paused";
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
	const normalizedStatus = agent.status ?? "active";

	const nextAgent = agentSchema.parse({
		id: agent.id,
		displayName: agent.displayName,
		roleDescription: normalizedRoleDescription,
		systemRole: agent.systemRole,
		status: normalizedStatus,
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

export async function updateAgent(
	missionDir: string,
	agentId: string,
	updates: Partial<Omit<AgentInput, "id" | "systemRole">>,
): Promise<void> {
	const agentsPath = join(missionDir, "agents.json");
	const agentsFile = await readJson(agentsPath, agentsSchema);
	const agent = agentsFile.agents.find((entry) => entry.id === agentId);

	if (!agent) {
		throw new Error(`Agent not found: ${agentId}`);
	}

	const nextAgent = agentSchema.parse({
		...agent,
		displayName: updates.displayName ?? agent.displayName,
		roleDescription: updates.roleDescription ?? agent.roleDescription,
		status: updates.status ?? agent.status,
	});

	const nextFile = agentsSchema.parse({
		...agentsFile,
		agents: agentsFile.agents.map((entry) =>
			entry.id === agentId ? nextAgent : entry,
		),
	});

	await writeJsonAtomic(agentsPath, nextFile);
}

export async function listAgents(missionDir: string) {
	return readJson(join(missionDir, "agents.json"), agentsSchema);
}

export function resolveWorkingPath(
	missionDir: string,
	agentId: string,
): string {
	return join(missionDir, "working", `${agentId}.md`);
}

export async function readWorkingFile(
	missionDir: string,
	agentId: string,
): Promise<string> {
	const workingPath = resolveWorkingPath(missionDir, agentId);
	if (!(await pathExists(workingPath))) {
		return "";
	}
	return readFile(workingPath, "utf8");
}
