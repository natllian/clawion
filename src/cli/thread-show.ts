import { formatLocalTime } from "../core/time";
import { listTasks } from "../core/workspace/tasks";
import { getThread } from "../core/workspace/threads";

type ThreadShowOptions = {
	missionsDir: string;
	missionId: string;
	taskId: string;
};

export async function runThreadShow(options: ThreadShowOptions): Promise<void> {
	const { missionsDir, missionId, taskId } = options;

	const [tasksFile, thread] = await Promise.all([
		listTasks(missionsDir, missionId),
		getThread(missionsDir, missionId, taskId),
	]);

	const task = tasksFile.tasks.find((entry) => entry.id === taskId);
	const taskTitle = task?.title ?? taskId;

	const lines: string[] = [];

	lines.push(
		`## Thread for Task: ${taskId} — ${taskTitle} (${thread.messages.length} messages)`,
	);

	if (thread.messages.length === 0) {
		lines.push("");
		lines.push("_No messages in this thread._");
	} else {
		for (const message of thread.messages) {
			const mentions = message.mentionsAgentIds
				.map((id) => `@${id}`)
				.join(", ");
			lines.push("");
			lines.push(
				`[${formatLocalTime(message.createdAt)}] @${message.authorAgentId} (mentions: ${mentions})`,
			);
			lines.push(message.content.trim());
		}
	}

	console.log(lines.join("\n"));
}
