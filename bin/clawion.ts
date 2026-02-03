#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import { Command } from "commander";
import { ensureWorkspace } from "../src/core/workspace/init";
import { resolveMissionsDir } from "../src/core/workspace/paths";

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

program
	.command("mission <action>")
	.description("Mission management commands (planned)")
	.action((action) => {
		console.error(`mission ${action} is not implemented yet.`);
		process.exitCode = 1;
	});

program
	.command("task <action>")
	.description("Task management commands (planned)")
	.action((action) => {
		console.error(`task ${action} is not implemented yet.`);
		process.exitCode = 1;
	});

program
	.command("worker <action>")
	.description("Worker management commands (planned)")
	.action((action) => {
		console.error(`worker ${action} is not implemented yet.`);
		process.exitCode = 1;
	});

program
	.command("thread <action>")
	.description("Thread management commands (planned)")
	.action((action) => {
		console.error(`thread ${action} is not implemented yet.`);
		process.exitCode = 1;
	});

program
	.command("log <action>")
	.description("Log management commands (planned)")
	.action((action) => {
		console.error(`log ${action} is not implemented yet.`);
		process.exitCode = 1;
	});

await program.parseAsync(process.argv);

if (!context.missionsDir) {
	const options = program.opts() as { missionsDir?: string };
	const missionsDir = resolveMissionsDir(options.missionsDir);
	context.missionsDir = missionsDir;
	await ensureWorkspace({ missionsDir });
}
