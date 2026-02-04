import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson } from "../src/core/fs/json";
import { pathExists } from "../src/core/fs/util";
import {
	agentsSchema,
	missionSchema,
	missionsIndexSchema,
	tasksSchema,
} from "../src/core/schemas";
import { ensureWorkspace } from "../src/core/workspace/init";

async function createTempDir(): Promise<string> {
	return mkdtemp(join(tmpdir(), "clawion-test-"));
}

describe("ensureWorkspace", () => {
	it("creates workspace layout and template files", async () => {
		const missionsDir = await createTempDir();
		await ensureWorkspace({ missionsDir });

		const indexPath = join(missionsDir, "index.json");
		const templateDir = join(missionsDir, "_template");

		expect(await pathExists(indexPath)).toBe(true);
		expect(await pathExists(templateDir)).toBe(true);
		expect(await pathExists(join(templateDir, "mission.json"))).toBe(true);
		expect(await pathExists(join(templateDir, "tasks.json"))).toBe(true);
		expect(await pathExists(join(templateDir, "agents.json"))).toBe(true);
		expect(await pathExists(join(templateDir, "ROADMAP.md"))).toBe(true);
		expect(await pathExists(join(templateDir, "working"))).toBe(true);
		expect(await pathExists(join(templateDir, "threads"))).toBe(true);
		expect(await pathExists(join(templateDir, "logs"))).toBe(true);

		const indexJson = await readJson(indexPath, missionsIndexSchema);
		expect(indexJson.missions).toHaveLength(0);

		await readJson(join(templateDir, "mission.json"), missionSchema);
		await readJson(join(templateDir, "tasks.json"), tasksSchema);
		await readJson(join(templateDir, "agents.json"), agentsSchema);
	});

	it("is idempotent when run multiple times", async () => {
		const missionsDir = await createTempDir();
		await ensureWorkspace({ missionsDir });

		const missionPath = join(missionsDir, "_template", "mission.json");
		const first = await readFile(missionPath, "utf8");

		await ensureWorkspace({ missionsDir });
		const second = await readFile(missionPath, "utf8");

		expect(second).toBe(first);
	});
});
