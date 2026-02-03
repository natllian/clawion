import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeJsonAtomic } from "../src/core/fs/json";

describe("writeJsonAtomic", () => {
	it("writes pretty JSON with newline", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-json-"));
		const filePath = join(dir, "data.json");

		await writeJsonAtomic(filePath, { hello: "world", count: 1 });

		const content = await readFile(filePath, "utf8");
		expect(content.endsWith("\n")).toBe(true);
		expect(JSON.parse(content)).toEqual({ hello: "world", count: 1 });
	});
});
