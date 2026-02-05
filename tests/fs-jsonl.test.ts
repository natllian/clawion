import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readJsonLines } from "../src/core/fs/jsonl";

describe("readJsonLines validation", () => {
	it("throws on invalid JSON line", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-jsonl-"));
		const filePath = join(dir, "data.jsonl");
		await writeFile(filePath, '{"valid": true}\nnot json\n{"also": "valid"}');

		try {
			await readJsonLines(filePath);
			expect(false).toBe(true);
		} catch (error) {
			expect(error instanceof Error).toBe(true);
			expect((error as Error).message).toContain("Invalid JSONL");
			// Error message contains line info (e.g., ":2:")
			expect((error as Error).message).toContain(":2");
		}
	});

	it("throws with line number on validation error", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-jsonl-"));
		const filePath = join(dir, "data.jsonl");
		await writeFile(filePath, '{"id": "one"}\n{"id": 2}');

		const schema = z.object({
			id: z.string(),
		});

		try {
			await readJsonLines(filePath, schema);
			expect(false).toBe(true);
		} catch (error) {
			expect(error instanceof Error).toBe(true);
			expect((error as Error).message).toContain("Validation failed");
			// Error message contains line info (e.g., ":2:")
			expect((error as Error).message).toContain(":2");
		}
	});

	it("returns empty array for empty file", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-jsonl-"));
		const filePath = join(dir, "empty.jsonl");
		await writeFile(filePath, "");

		const result = await readJsonLines(filePath);
		expect(result).toEqual([]);
	});

	it("handles trailing newline", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-jsonl-"));
		const filePath = join(dir, "data.jsonl");
		await writeFile(filePath, '{"a": 1}\n{"b": 2}\n');

		const result = await readJsonLines(filePath);
		expect(result).toHaveLength(2);
	});
});
