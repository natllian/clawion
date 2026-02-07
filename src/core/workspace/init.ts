import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { writeJsonAtomic } from "../fs/json";
import { writeMarkdownAtomic } from "../fs/markdown";
import { pathExists } from "../fs/util";
import { nowLocal } from "../time";

type WorkspaceInitOptions = {
	missionsDir: string;
};

function defaultMissionTemplate() {
	const now = nowLocal();
	return {
		schemaVersion: 1,
		id: "template",
		name: "Template Mission",
		status: "active",
		createdAt: now,
		updatedAt: now,
	};
}

function defaultTasksTemplate() {
	return {
		schemaVersion: 1,
		description: "Tasks for this mission.",
		columns: [
			{ id: "pending", name: "Pending", order: 1 },
			{ id: "ongoing", name: "Ongoing", order: 2 },
			{ id: "blocked", name: "Blocked", order: 3 },
			{ id: "completed", name: "Completed", order: 4 },
		],
		tasks: [],
	};
}

function defaultAgentsTemplate() {
	return {
		schemaVersion: 1,
		agents: [],
	};
}

function defaultIndexFile() {
	return {
		schemaVersion: 1,
		updatedAt: nowLocal(),
		missions: [],
	};
}

async function ensureDir(dirPath: string): Promise<void> {
	await mkdir(dirPath, { recursive: true });
}

async function ensureJsonFile(
	filePath: string,
	content: Record<string, unknown>,
): Promise<void> {
	if (await pathExists(filePath)) {
		return;
	}
	await writeJsonAtomic(filePath, content);
}

async function ensureMarkdownFile(
	filePath: string,
	content: string,
): Promise<void> {
	if (await pathExists(filePath)) {
		return;
	}
	await writeMarkdownAtomic(filePath, content);
}

export async function ensureWorkspace(
	options: WorkspaceInitOptions,
): Promise<void> {
	const missionsDir = options.missionsDir;
	await ensureDir(missionsDir);

	const indexPath = join(missionsDir, "index.json");
	await ensureJsonFile(indexPath, defaultIndexFile());

	const templateDir = join(missionsDir, "_template");
	await ensureDir(templateDir);

	await ensureJsonFile(
		join(templateDir, "mission.json"),
		defaultMissionTemplate(),
	);
	await ensureJsonFile(join(templateDir, "tasks.json"), defaultTasksTemplate());
	await ensureJsonFile(
		join(templateDir, "agents.json"),
		defaultAgentsTemplate(),
	);
	await ensureMarkdownFile(join(templateDir, "ROADMAP.md"), "");

	await ensureDir(join(templateDir, "threads"));
	await ensureDir(join(templateDir, "inbox"));
	await ensureDir(join(templateDir, "working"));
	await ensureDir(join(templateDir, "secrets"));
}
