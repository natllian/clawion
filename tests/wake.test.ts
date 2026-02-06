import { describe, expect, it } from "vitest";
import { buildReplyHereCommand } from "../src/cli/wake";

describe("wake reply command template", () => {
	it("builds a copy-pastable reply command with mission, task, agent and mentions", () => {
		const command = buildReplyHereCommand("m1", "t1", "agent-1", ["manager-1"]);
		expect(command).toBe(
			'clawion message add --mission m1 --task t1 --content "..." --mentions manager-1 --agent agent-1',
		);
	});

	it("supports multiple mention recipients", () => {
		const command = buildReplyHereCommand("m1", "t1", "agent-1", [
			"worker-1",
			"manager-1",
		]);
		expect(command).toContain("--mentions worker-1,manager-1");
	});
});
