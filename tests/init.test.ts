import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveOpenClawConfigPath, runInit } from "../src/cli/init";
import { pathExists } from "../src/core/fs/util";

async function createTempDir(): Promise<string> {
	return mkdtemp(join(tmpdir(), "clawion-init-test-"));
}

describe("resolveOpenClawConfigPath", () => {
	it("uses OPENCLAW_CONFIG_PATH exactly when provided", () => {
		const configPath = resolveOpenClawConfigPath(
			{
				OPENCLAW_CONFIG_PATH: "/tmp/custom/openclaw.json",
				OPENCLAW_STATE_DIR: "/tmp/state",
				OPENCLAW_HOME: "/tmp/home",
			},
			"/system/home",
		);

		expect(configPath).toBe("/tmp/custom/openclaw.json");
	});

	it("uses OPENCLAW_STATE_DIR/openclaw.json when OPENCLAW_CONFIG_PATH is missing", () => {
		const configPath = resolveOpenClawConfigPath(
			{
				OPENCLAW_STATE_DIR: "/tmp/state",
				OPENCLAW_HOME: "/tmp/home",
			},
			"/system/home",
		);

		expect(configPath).toBe("/tmp/state/openclaw.json");
	});

	it("falls back to OPENCLAW_HOME/.openclaw/openclaw.json", () => {
		const configPath = resolveOpenClawConfigPath(
			{
				OPENCLAW_HOME: "/tmp/openclaw-home",
			},
			"/system/home",
		);

		expect(configPath).toBe("/tmp/openclaw-home/.openclaw/openclaw.json");
	});

	it("falls back to system home when OPENCLAW_HOME is missing", () => {
		const configPath = resolveOpenClawConfigPath({}, "/system/home");
		expect(configPath).toBe("/system/home/.openclaw/openclaw.json");
	});
});

describe("runInit", () => {
	it("installs SKILL.md into agents.defaults.workspace", async () => {
		const root = await createTempDir();
		const configPath = join(root, "openclaw.json");
		const workspaceDir = join(root, "workspace");
		const sourceSkillPath = join(root, "source", "SKILL.md");

		await mkdir(resolve(sourceSkillPath, ".."), { recursive: true });
		await writeFile(sourceSkillPath, "# test skill");

		await writeFile(
			configPath,
			JSON.stringify({
				agents: {
					defaults: {
						workspace: workspaceDir,
					},
				},
			}),
		);

		const result = await runInit({
			env: {
				OPENCLAW_CONFIG_PATH: configPath,
			},
			skillSourcePath: sourceSkillPath,
		});

		const targetPath = join(workspaceDir, "skills", "clawion", "SKILL.md");
		expect(result.configPath).toBe(configPath);
		expect(result.workspaceDir).toBe(workspaceDir);
		expect(result.targetPath).toBe(targetPath);
		expect(await pathExists(targetPath)).toBe(true);
		expect(await readFile(targetPath, "utf8")).toBe("# test skill");
	});

	it("throws when openclaw.json does not exist", async () => {
		const root = await createTempDir();
		const missingConfigPath = join(root, "missing", "openclaw.json");

		await expect(
			runInit({
				env: {
					OPENCLAW_CONFIG_PATH: missingConfigPath,
				},
			}),
		).rejects.toThrow("OpenClaw config not found");
	});

	it("throws when workspace is missing in openclaw config", async () => {
		const root = await createTempDir();
		const configPath = join(root, "openclaw.json");

		await writeFile(
			configPath,
			JSON.stringify({
				agents: {
					defaults: {},
				},
			}),
		);

		await expect(
			runInit({
				env: {
					OPENCLAW_CONFIG_PATH: configPath,
				},
			}),
		).rejects.toThrow("agents.defaults.workspace");
	});
});
