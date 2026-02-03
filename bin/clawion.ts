#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import { Command } from "commander";
import { ensureWorkspace } from "../src/core/workspace/init";
import { resolveMissionsDir } from "../src/core/workspace/paths";
import { assertManager } from "../src/core/workspace/permissions";

type CliContext = {
	missionsDir: string;
};

const context: CliContext = {
	missionsDir: "",
};

const program = new Command();

program
	.name("clawion")
	.description("Clawion CLI")
	.option("--missions-dir <path>", "Override missions directory")
	.option("--worker <workerId>", "Worker ID for scoped actions")
	.showHelpAfterError();

program.hook("preAction", async (_thisCommand, actionCommand) => {
	const options = actionCommand.optsWithGlobals() as {
		missionsDir?: string;
	};
	const missionsDir = resolveMissionsDir(options.missionsDir);
	context.missionsDir = missionsDir;
	await ensureWorkspace({ missionsDir });
});

program
	.command("where")
	.description("Print the missions directory")
	.action(() => {
		console.log(context.missionsDir);
	});

program
	.command("init")
	.description("Initialize the workspace")
	.action(() => {
		console.log(`Workspace ready: ${context.missionsDir}`);
	});

program
	.command("ui")
	.description("Start the web UI dev server")
	.action(() => {
		const child = spawn("pnpm", ["dev"], {
			stdio: "inherit",
		});

		child.on("exit", (code) => {
			process.exit(code ?? 0);
		});
	});

function resolveWorkerId(command: Command): string | null {
	const options = command.optsWithGlobals() as { worker?: string };
	const workerId = options.worker?.trim();
	return workerId && workerId.length > 0 ? workerId : null;
}

async function requireManager(
	command: Command,
	missionId: string,
): Promise<boolean> {
	const workerId = resolveWorkerId(command);
	if (!workerId) {
		console.error("Manager-only command requires --worker <id>.");
		process.exitCode = 1;
		return false;
	}

	try {
		await assertManager({
			missionsDir: context.missionsDir,
			missionId,
			workerId,
		});
		return true;
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
		return false;
	}
}

const mission = program.command("mission").description("Mission management");

mission
	.command("complete")
	.description("Mark a mission as complete (manager only)")
	.requiredOption("--mission <id>", "Mission ID")
	.action(async (options, command) => {
		const allowed = await requireManager(command, options.mission);
		if (!allowed) {
			return;
		}
		console.error("mission complete is not implemented yet.");
		process.exitCode = 1;
	});

mission.action(() => {
	mission.help();
});

const task = program.command("task").description("Task management");

task
	.command("assign")
	.description("Assign a task to a worker (manager only)")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--task <id>", "Task ID")
	.requiredOption("--to <workerId>", "Assignee worker ID")
	.action(async (options, command) => {
		const allowed = await requireManager(command, options.mission);
		if (!allowed) {
			return;
		}
		console.error("task assign is not implemented yet.");
		process.exitCode = 1;
	});

task.action(() => {
	task.help();
});

const worker = program.command("worker").description("Worker management");
worker.action(() => {
	worker.help();
});

const thread = program.command("thread").description("Thread management");
thread.action(() => {
	thread.help();
});

const log = program.command("log").description("Log management");
log.action(() => {
	log.help();
});

await program.parseAsync(process.argv);

if (!context.missionsDir) {
	const options = program.opts() as { missionsDir?: string };
	const missionsDir = resolveMissionsDir(options.missionsDir);
	context.missionsDir = missionsDir;
	await ensureWorkspace({ missionsDir });
}
