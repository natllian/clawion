export type TaskStatus = "pending" | "ongoing" | "blocked" | "completed";

export type TaskColumnLike = {
	id: string;
	name: string;
	order: number;
};

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

const STATUS_ALIASES: Record<TaskStatus, string[]> = {
	pending: ["pending", "todo", "to do"],
	ongoing: ["ongoing", "doing", "in progress", "in-progress"],
	blocked: ["blocked"],
	completed: ["completed", "done", "complete"],
};

function columnMatchesStatus(
	column: TaskColumnLike,
	status: TaskStatus,
): boolean {
	const id = normalize(column.id);
	const name = normalize(column.name);
	return STATUS_ALIASES[status].some((alias) => {
		const key = normalize(alias);
		return id === key || name === key || name.includes(key);
	});
}

function sortedColumns(columns: TaskColumnLike[]): TaskColumnLike[] {
	return [...columns].sort((a, b) => a.order - b.order);
}

export function resolveColumnIdForStatus(
	columns: TaskColumnLike[],
	status: TaskStatus,
): string {
	const direct = columns.find((column) => columnMatchesStatus(column, status));
	if (direct) return direct.id;

	const ordered = sortedColumns(columns);
	const first = ordered[0];
	if (!first) {
		throw new Error("No columns available to map task status.");
	}

	if (status === "pending") return first.id;
	if (status === "ongoing") return (ordered[1] ?? first).id;
	if (status === "blocked") {
		const blocked = ordered[2] ?? ordered[ordered.length - 1] ?? first;
		return blocked.id;
	}

	const last = ordered[ordered.length - 1] ?? first;
	return last.id;
}

export function resolveStatusForColumn(
	columns: TaskColumnLike[],
	columnId: string,
): TaskStatus {
	const column = columns.find((entry) => entry.id === columnId);
	if (!column) {
		// Best-effort fallback for unknown column IDs.
		return "pending";
	}

	for (const status of Object.keys(STATUS_ALIASES) as TaskStatus[]) {
		if (columnMatchesStatus(column, status)) {
			return status;
		}
	}

	const ordered = sortedColumns(columns);
	const index = ordered.findIndex((entry) => entry.id === columnId);
	if (index <= 0) return "pending";
	if (index === ordered.length - 1) return "completed";
	if (index === 1) return "ongoing";
	return "blocked";
}
