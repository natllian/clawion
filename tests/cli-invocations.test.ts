import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	appendCliInvocation,
	resolveCliInvocationsPath,
} from "../src/core/workspace/cli-invocations";

describe("cli invocation logging", () => {
	it("appends jsonl entries to the missions dir", async () => {
		const missionsDir = await mkdtemp(join(tmpdir(), "clawion-cli-"));
		await appendCliInvocation(missionsDir, "clawion agent list --mission m1");
		await appendCliInvocation(missionsDir, "clawion where");

		const path = resolveCliInvocationsPath(missionsDir);
		const content = await readFile(path, "utf8");
		const lines = content.trim().split("\n");

		expect(lines).toHaveLength(2);
		expect(JSON.parse(lines[0]).command).toEqual(
			"clawion agent list --mission m1",
		);
		expect(JSON.parse(lines[1]).command).toEqual("clawion where");
	});
});
