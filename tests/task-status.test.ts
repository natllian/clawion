import { describe, expect, it } from "vitest";
import type { TaskColumnLike } from "../src/core/task-status";
import {
	resolveColumnIdForStatus,
	resolveStatusForColumn,
} from "../src/core/task-status";

const createColumn = (
	id: string,
	name: string,
	order: number,
): TaskColumnLike => ({
	id,
	name,
	order,
});

describe("resolveColumnIdForStatus", () => {
	it("returns matching column ID when found by id", () => {
		const columns = [
			createColumn("todo", "To Do", 0),
			createColumn("doing", "In Progress", 1),
			createColumn("done", "Done", 2),
		];

		expect(resolveColumnIdForStatus(columns, "pending")).toBe("todo");
		expect(resolveColumnIdForStatus(columns, "ongoing")).toBe("doing");
		expect(resolveColumnIdForStatus(columns, "completed")).toBe("done");
	});

	it("returns matching column ID when found by name", () => {
		const columns = [
			createColumn("col-1", "Pending Tasks", 0),
			createColumn("col-2", "In Progress", 1),
			createColumn("col-3", "Complete", 2),
		];

		expect(resolveColumnIdForStatus(columns, "pending")).toBe("col-1");
		expect(resolveColumnIdForStatus(columns, "ongoing")).toBe("col-2");
		expect(resolveColumnIdForStatus(columns, "completed")).toBe("col-3");
	});

	it("returns first column for pending when no match", () => {
		const columns = [
			createColumn("start", "Start", 0),
			createColumn("middle", "Middle", 1),
			createColumn("end", "End", 2),
		];

		expect(resolveColumnIdForStatus(columns, "pending")).toBe("start");
	});

	it("returns second column for ongoing when no match", () => {
		const columns = [
			createColumn("start", "Start", 0),
			createColumn("middle", "Middle", 1),
			createColumn("end", "End", 2),
		];

		expect(resolveColumnIdForStatus(columns, "ongoing")).toBe("middle");
	});

	it("returns last column for blocked when no match", () => {
		const columns = [
			createColumn("start", "Start", 0),
			createColumn("middle", "Middle", 1),
			createColumn("end", "End", 2),
		];

		expect(resolveColumnIdForStatus(columns, "blocked")).toBe("end");
	});

	it("returns last column for completed when no match", () => {
		const columns = [
			createColumn("start", "Start", 0),
			createColumn("middle", "Middle", 1),
			createColumn("end", "End", 2),
		];

		expect(resolveColumnIdForStatus(columns, "completed")).toBe("end");
	});

	it("throws error when columns array is empty", () => {
		expect(() => resolveColumnIdForStatus([], "pending")).toThrow(
			"No columns available to map task status.",
		);
	});
});

describe("resolveStatusForColumn", () => {
	it("returns pending for columns matching pending aliases", () => {
		const columns = [
			createColumn("todo", "To Do", 0),
			createColumn("pending", "Pending", 1),
		];

		expect(resolveStatusForColumn(columns, "todo")).toBe("pending");
		expect(resolveStatusForColumn(columns, "pending")).toBe("pending");
	});

	it("returns ongoing for columns matching ongoing aliases", () => {
		const columns = [
			createColumn("doing", "Doing", 0),
			createColumn("in-progress", "In Progress", 1),
		];

		expect(resolveStatusForColumn(columns, "doing")).toBe("ongoing");
		expect(resolveStatusForColumn(columns, "in-progress")).toBe("ongoing");
	});

	it("returns completed for columns matching completed aliases", () => {
		const columns = [
			createColumn("done", "Done", 0),
			createColumn("complete", "Complete", 1),
		];

		expect(resolveStatusForColumn(columns, "done")).toBe("completed");
		expect(resolveStatusForColumn(columns, "complete")).toBe("completed");
	});

	it("returns blocked for blocked columns", () => {
		const columns = [createColumn("blocked", "Blocked", 0)];
		expect(resolveStatusForColumn(columns, "blocked")).toBe("blocked");
	});

	it("returns pending for first column by index", () => {
		const columns = [
			createColumn("first", "First", 0),
			createColumn("middle", "Middle", 1),
			createColumn("last", "Last", 2),
		];

		expect(resolveStatusForColumn(columns, "first")).toBe("pending");
	});

	it("returns ongoing for middle column when no match", () => {
		const columns = [
			createColumn("first", "First", 0),
			createColumn("middle", "Middle", 1),
			createColumn("last", "Last", 2),
		];

		expect(resolveStatusForColumn(columns, "middle")).toBe("ongoing");
	});

	it("returns completed for last column when no match", () => {
		const columns = [
			createColumn("first", "First", 0),
			createColumn("middle", "Middle", 1),
			createColumn("last", "Last", 2),
		];

		expect(resolveStatusForColumn(columns, "last")).toBe("completed");
	});

	it("returns blocked for third column when no match", () => {
		const columns = [
			createColumn("first", "First", 0),
			createColumn("second", "Second", 1),
			createColumn("third", "Third", 2),
			createColumn("fourth", "Fourth", 3),
		];

		expect(resolveStatusForColumn(columns, "third")).toBe("blocked");
	});

	it("returns pending for unknown column ID", () => {
		const columns = [createColumn("known", "Known", 0)];
		expect(resolveStatusForColumn(columns, "unknown")).toBe("pending");
	});

	it("handles columns with names containing status keywords", () => {
		const columns = [
			createColumn("col1", "Pending Tasks Queue", 0),
			createColumn("col2", "Work In Progress Here", 1),
			createColumn("col3", "All Done Tasks", 2),
		];

		expect(resolveStatusForColumn(columns, "col1")).toBe("pending");
		expect(resolveStatusForColumn(columns, "col2")).toBe("ongoing");
		expect(resolveStatusForColumn(columns, "col3")).toBe("completed");
	});
});
