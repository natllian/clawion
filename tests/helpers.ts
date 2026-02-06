import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureWorkspace } from "../src/core/workspace/init";
import { createMission } from "../src/core/workspace/missions";

export async function createWorkspace(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "clawion-test-"));
	await ensureWorkspace({ missionsDir: root });
	return root;
}

export async function createMissionFixture(
	missionsDir: string,
	id = "m1",
): Promise<void> {
	await createMission({
		missionsDir,
		id,
		name: "Mission One",
	});
}
