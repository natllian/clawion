#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import { Command } from "commander";
import { ensureWorkspace } from "../src/core/workspace/init";
import { addLogEvent } from "../src/core/workspace/logs";
import { resolveMissionPath } from "../src/core/workspace/mission";
import {
	completeMission,
	createMission,
	listMissions,
	showMission,
	updateMission,
} from "../src/core/workspace/missions";
import { resolveMissionsDir } from "../src/core/workspace/paths";
import { assertManager } from "../src/core/workspace/permissions";
import {
	assignTask,
	createTask,
	listTasks,
	updateTask,
} from "../src/core/workspace/tasks";
import {
	addThreadMessage,
	resolveThreadMessage,
	unresolveThreadMessage,
} from "../src/core/workspace/threads";
import {
	addWorker,
	listWorkers,
	resolveWorkingPath,
	updateWorker,
} from "../src/core/workspace/workers";

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

type HelpEntry = {
	command: string;
	purpose: string;
	params: string[];
	example?: string;
};

const HELP_ENTRIES: HelpEntry[] = [
	{
		command: "where",
		purpose: "Print the active missions directory.",
		params: ["(no params)"],
		example: "clawion where",
	},
	{
		command: "init",
		purpose: "Initialize the workspace layout if missing.",
		params: ["(no params)"],
		example: "clawion init",
	},
	{
		command: "ui",
		purpose: "Start the web UI dev server.",
		params: ["(no params)"],
		example: "clawion ui",
	},
	{
		command: "mission create",
		purpose: "Create a new mission from the template.",
		params: ["--id <id>", "--name <name>", "--description <text>"],
		example:
			"clawion mission create --id m1 --name 'Alpha' --description 'Build MVP'",
	},
	{
		command: "mission list",
		purpose: "List missions from index.json.",
		params: ["(no params)"],
		example: "clawion mission list",
	},
	{
		command: "mission show",
		purpose: "Show mission metadata and roadmap.",
		params: ["--id <id>"],
		example: "clawion mission show --id m1",
	},
	{
		command: "mission update",
		purpose: "Update a mission description.",
		params: ["--id <id>", "--description <text>"],
		example: "clawion mission update --id m1 --description 'New scope'",
	},
	{
		command: "mission complete",
		purpose: "Mark a mission completed (manager only).",
		params: ["--id <id>", "--worker <managerId>"],
		example: "clawion mission complete --id m1 --worker manager-1",
	},
	{
		command: "task create",
		purpose: "Create a task in a mission.",
		params: [
			"--mission <id>",
			"--id <taskId>",
			"--title <title>",
			"--description <text>",
			"--column <colId> (optional)",
		],
		example:
			"clawion task create --mission m1 --id t1 --title 'Spec' --description 'Write spec'",
	},
	{
		command: "task list",
		purpose: "List tasks for a mission.",
		params: ["--mission <id>"],
		example: "clawion task list --mission m1",
	},
	{
		command: "task update",
		purpose: "Update task status notes or column.",
		params: [
			"--mission <id>",
			"--id <taskId>",
			"--status-notes <text> (optional)",
			"--column <colId> (optional)",
		],
		example:
			"clawion task update --mission m1 --id t1 --status-notes 'Blocked: ...'",
	},
	{
		command: "task assign",
		purpose: "Assign a task to a worker (manager only).",
		params: [
			"--mission <id>",
			"--task <taskId>",
			"--to <workerId>",
			"--worker <managerId>",
		],
		example:
			"clawion task assign --mission m1 --task t1 --to w1 --worker manager-1",
	},
	{
		command: "worker add",
		purpose: "Register a worker for a mission.",
		params: [
			"--mission <id>",
			"--id <workerId>",
			"--name <displayName>",
			"--system-role <manager|worker>",
			"--role-description <text> (optional for manager)",
			"--status <active|paused> (optional)",
		],
		example:
			"clawion worker add --mission m1 --id manager-1 --name Manager --system-role manager",
	},
	{
		command: "worker update",
		purpose: "Update a worker profile.",
		params: [
			"--mission <id>",
			"--id <workerId>",
			"--name <displayName> (optional)",
			"--role-description <text> (optional)",
			"--status <active|paused> (optional)",
		],
		example: "clawion worker update --mission m1 --id w1 --status paused",
	},
	{
		command: "worker list",
		purpose: "List workers for a mission.",
		params: ["--mission <id>"],
		example: "clawion worker list --mission m1",
	},
	{
		command: "worker working",
		purpose: "Print path to a worker working file.",
		params: ["--mission <id>", "--id <workerId>"],
		example: "clawion worker working --mission m1 --id w1",
	},
	{
		command: "thread add",
		purpose: "Append a message to a task thread.",
		params: [
			"--mission <id>",
			"--task <taskId>",
			"--title <text>",
			"--content <text>",
			"--mentions <workerId>",
			"--worker <authorId>",
		],
		example:
			"clawion thread add --mission m1 --task t1 --title 'API Review' --content 'Please review' --mentions w1 --worker manager-1",
	},
	{
		command: "thread resolve",
		purpose: "Resolve a thread message.",
		params: [
			"--mission <id>",
			"--task <taskId>",
			"--message <messageId>",
			"--worker <resolverId>",
		],
		example:
			"clawion thread resolve --mission m1 --task t1 --message msg1 --worker w1",
	},
	{
		command: "thread unresolve",
		purpose: "Reopen a thread message.",
		params: ["--mission <id>", "--task <taskId>", "--message <messageId>"],
		example: "clawion thread unresolve --mission m1 --task t1 --message msg1",
	},
	{
		command: "log add",
		purpose: "Append a log event for a worker.",
		params: [
			"--mission <id>",
			"--worker <workerId>",
			"--level <info|warn|error>",
			"--type <type>",
			"--message <text>",
			"--task <taskId> (optional)",
			"--thread <threadId> (optional)",
		],
		example:
			"clawion log add --mission m1 --worker w1 --level info --type task:update --message 'Updated task'",
	},
];

function renderHelp(topic?: string) {
	if (!topic) {
		const commands = HELP_ENTRIES.map((entry) => entry.command).join("\n");
		console.log("Clawion Help");
		console.log(`\nCommands:\n${commands}`);
		console.log("\nUse: clawion help <command> for details.");
		return;
	}

	const entry = HELP_ENTRIES.find((item) => item.command === topic);
	if (!entry) {
		console.log(`Unknown help topic: ${topic}`);
		return;
	}

	console.log(`Command: ${entry.command}`);
	console.log(`Purpose: ${entry.purpose}`);
	console.log("Parameters:");
	for (const param of entry.params) {
		console.log(`- ${param}`);
	}
	if (entry.example) {
		console.log(`Example: ${entry.example}`);
	}
}

program
	.command("help [topic...]")
	.description("Show detailed command help")
	.action((topics: string[] | undefined) => {
		const topic = topics && topics.length > 0 ? topics.join(" ") : undefined;
		renderHelp(topic);
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
	.command("create")
	.description("Create a mission from the template")
	.requiredOption("--id <id>", "Mission ID")
	.requiredOption("--name <name>", "Mission name")
	.requiredOption("--description <text>", "Mission description")
	.action(async (options) => {
		try {
			await createMission({
				missionsDir: context.missionsDir,
				id: options.id,
				name: options.name,
				description: options.description,
			});
			console.log(`Mission created: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

mission
	.command("list")
	.description("List missions")
	.action(async () => {
		try {
			const missions = await listMissions(context.missionsDir);
			console.log(JSON.stringify(missions, null, 2));
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

mission
	.command("show")
	.description("Show mission metadata and roadmap")
	.requiredOption("--id <id>", "Mission ID")
	.action(async (options) => {
		try {
			const data = await showMission(context.missionsDir, options.id);
			console.log(JSON.stringify(data, null, 2));
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

mission
	.command("update")
	.description("Update a mission description")
	.requiredOption("--id <id>", "Mission ID")
	.requiredOption("--description <text>", "New description")
	.action(async (options) => {
		try {
			await updateMission({
				missionsDir: context.missionsDir,
				id: options.id,
				description: options.description,
			});
			console.log(`Mission updated: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

mission
	.command("complete")
	.description("Mark a mission as completed (manager only)")
	.requiredOption("--id <id>", "Mission ID")
	.action(async (options, command) => {
		const allowed = await requireManager(command, options.id);
		if (!allowed) {
			return;
		}
		try {
			await completeMission(context.missionsDir, options.id);
			console.log(`Mission completed: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

mission.action(() => {
	mission.help();
});

const task = program.command("task").description("Task management");

task
	.command("create")
	.description("Create a task")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--id <taskId>", "Task ID")
	.requiredOption("--title <title>", "Task title")
	.requiredOption("--description <text>", "Task description")
	.option("--column <colId>", "Column ID")
	.action(async (options) => {
		try {
			await createTask({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				id: options.id,
				title: options.title,
				description: options.description,
				columnId: options.column,
			});
			console.log(`Task created: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

task
	.command("list")
	.description("List tasks")
	.requiredOption("--mission <id>", "Mission ID")
	.action(async (options) => {
		try {
			const tasksFile = await listTasks(context.missionsDir, options.mission);
			console.log(JSON.stringify(tasksFile, null, 2));
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

task
	.command("update")
	.description("Update task status or column")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--id <taskId>", "Task ID")
	.option("--status-notes <text>", "Status notes")
	.option("--column <colId>", "Column ID")
	.action(async (options) => {
		try {
			await updateTask({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				id: options.id,
				statusNotes: options.statusNotes,
				columnId: options.column,
			});
			console.log(`Task updated: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

task
	.command("assign")
	.description("Assign a task to a worker (manager only)")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--task <taskId>", "Task ID")
	.requiredOption("--to <workerId>", "Assignee worker ID")
	.action(async (options, command) => {
		const allowed = await requireManager(command, options.mission);
		if (!allowed) {
			return;
		}
		try {
			await assignTask(
				context.missionsDir,
				options.mission,
				options.task,
				options.to,
			);
			console.log(`Task assigned: ${options.task}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

task.action(() => {
	task.help();
});

const worker = program.command("worker").description("Worker management");

worker
	.command("add")
	.description("Register a worker for a mission")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--id <workerId>", "Worker ID")
	.requiredOption("--name <displayName>", "Display name")
	.requiredOption("--system-role <role>", "System role (manager|worker)")
	.option("--role-description <text>", "Role description for the worker")
	.option("--status <status>", "Status (active|paused)", "active")
	.action(async (options) => {
		const missionPath = await resolveMissionPath(
			context.missionsDir,
			options.mission,
		);

		const systemRole = options.systemRole as "manager" | "worker";
		if (systemRole !== "manager" && systemRole !== "worker") {
			console.error("system-role must be manager or worker.");
			process.exitCode = 1;
			return;
		}

		const status = options.status as "active" | "paused";
		if (status !== "active" && status !== "paused") {
			console.error("status must be active or paused.");
			process.exitCode = 1;
			return;
		}

		try {
			await addWorker(missionPath, {
				id: options.id,
				displayName: options.name,
				roleDescription: options.roleDescription,
				systemRole,
				status,
			});
			console.log(`Worker registered: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

worker
	.command("update")
	.description("Update a worker profile")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--id <workerId>", "Worker ID")
	.option("--name <displayName>", "Display name")
	.option("--role-description <text>", "Role description")
	.option("--status <status>", "Status (active|paused)")
	.action(async (options) => {
		try {
			const missionPath = await resolveMissionPath(
				context.missionsDir,
				options.mission,
			);
			await updateWorker(missionPath, options.id, {
				displayName: options.name,
				roleDescription: options.roleDescription,
				status: options.status,
			});
			console.log(`Worker updated: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

worker
	.command("list")
	.description("List workers")
	.requiredOption("--mission <id>", "Mission ID")
	.action(async (options) => {
		try {
			const missionPath = await resolveMissionPath(
				context.missionsDir,
				options.mission,
			);
			const workersFile = await listWorkers(missionPath);
			console.log(JSON.stringify(workersFile, null, 2));
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

worker
	.command("working")
	.description("Print path to a worker working file")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--id <workerId>", "Worker ID")
	.action(async (options) => {
		try {
			const missionPath = await resolveMissionPath(
				context.missionsDir,
				options.mission,
			);
			console.log(resolveWorkingPath(missionPath, options.id));
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

worker.action(() => {
	worker.help();
});

const thread = program.command("thread").description("Thread management");

thread
	.command("add")
	.description("Append a message to a task thread")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--task <taskId>", "Task ID")
	.requiredOption("--title <text>", "Thread title")
	.requiredOption("--content <text>", "Message content")
	.requiredOption("--mentions <workerId>", "Mentioned worker ID")
	.requiredOption("--worker <authorId>", "Author worker ID")
	.action(async (options) => {
		try {
			const messageId = await addThreadMessage({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				taskId: options.task,
				title: options.title,
				authorId: options.worker,
				mentions: options.mentions,
				content: options.content,
			});
			console.log(`Thread message added: ${messageId}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

thread
	.command("resolve")
	.description("Resolve a thread message")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--task <taskId>", "Task ID")
	.requiredOption("--message <messageId>", "Message ID")
	.requiredOption("--worker <resolverId>", "Resolver worker ID")
	.action(async (options) => {
		try {
			await resolveThreadMessage(
				context.missionsDir,
				options.mission,
				options.task,
				options.message,
				options.worker,
			);
			console.log(`Thread message resolved: ${options.message}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

thread
	.command("unresolve")
	.description("Reopen a thread message")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--task <taskId>", "Task ID")
	.requiredOption("--message <messageId>", "Message ID")
	.action(async (options) => {
		try {
			await unresolveThreadMessage(
				context.missionsDir,
				options.mission,
				options.task,
				options.message,
			);
			console.log(`Thread message unresolved: ${options.message}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

thread.action(() => {
	thread.help();
});

const log = program.command("log").description("Log management");

log
	.command("add")
	.description("Append a log event")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--worker <workerId>", "Worker ID")
	.requiredOption("--level <level>", "Level (info|warn|error)")
	.requiredOption("--type <type>", "Event type")
	.requiredOption("--message <text>", "Message")
	.option("--task <taskId>", "Task ID")
	.option("--thread <threadId>", "Thread ID")
	.action(async (options) => {
		const level = options.level as "info" | "warn" | "error";
		if (!["info", "warn", "error"].includes(level)) {
			console.error("level must be info, warn, or error.");
			process.exitCode = 1;
			return;
		}
		try {
			const eventId = await addLogEvent({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				workerId: options.worker,
				level,
				type: options.type,
				message: options.message,
				taskId: options.task,
				threadId: options.thread,
			});
			console.log(`Log event added: ${eventId}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

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
