import { mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { buildReplyHereCommand, runWake } from "../src/cli/wake";
import { createMissionFixture, createWorkspace } from "./helpers";

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

describe("runWake", () => {
	it("exits with error when agent not found", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		await runWake({
			missionId: "m1",
			agentId: "nonexistent-agent",
			missionsDir,
		});

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"Agent not found: nonexistent-agent",
		);
		expect(process.exitCode).toBe(1);
		process.exitCode = 0;
	});

	it("acknowledges unread mentions after wake", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const missionPath = `${missionsDir}/m1`;

		// Add agents
		await writeFile(
			`${missionPath}/agents.json`,
			JSON.stringify({
				schemaVersion: 1,
				agents: [
					{
						id: "worker-1",
						displayName: "Worker One",
						systemRole: "worker",
						roleDescription: "Worker",
					},
				],
			}),
		);

		// Create threads directory with a message mentioning worker-1
		const threadsDir = `${missionPath}/threads`;
		await mkdir(threadsDir, { recursive: true });
		await writeFile(
			`${threadsDir}/t1.jsonl`,
			JSON.stringify({
				type: "message",
				id: "msg-1",
				createdAt: "2026-02-06 10:00:00",
				authorAgentId: "manager-1",
				mentionsAgentIds: ["worker-1"],
				content: "Please review this",
			}),
		);

		// Spy on console.log to capture output (suppress it)
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		// Mock appendInboxAck to track if it was called
		const inboxModule = await import("../src/core/workspace/inbox");
		const appendInboxAckSpy = vi
			.spyOn(inboxModule, "appendInboxAck")
			.mockResolvedValue(
				undefined as unknown as Awaited<
					ReturnType<typeof inboxModule.appendInboxAck>
				>,
			);

		await runWake({
			missionId: "m1",
			agentId: "worker-1",
			missionsDir,
		});

		// Verify wake output was generated
		expect(logSpy).toHaveBeenCalled();

		// Verify unread mention was acknowledged
		expect(appendInboxAckSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				missionId: "m1",
				agentId: "worker-1",
				messageId: "msg-1",
				taskId: "t1",
			}),
		);
	});
});
