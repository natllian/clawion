import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeMarkdownAtomic } from "../src/core/fs/markdown";

describe("writeMarkdownAtomic", () => {
	it("adds newline when missing", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-md-"));
		const filePath = join(dir, "note.md");
		await writeMarkdownAtomic(filePath, "hello");
		const content = await readFile(filePath, "utf8");
		expect(content).toBe("hello\n");
	});

	it("preserves newline when present", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-md-"));
		const filePath = join(dir, "note.md");
		await writeMarkdownAtomic(filePath, "hello\n");
		const content = await readFile(filePath, "utf8");
		expect(content).toBe("hello\n");
	});
});
