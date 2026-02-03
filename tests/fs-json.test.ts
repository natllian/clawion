import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson, writeJsonAtomic } from "../src/core/fs/json";
import { missionSchema } from "../src/core/schemas";

describe("writeJsonAtomic", () => {
	it("writes pretty JSON with newline", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-json-"));
		const filePath = join(dir, "data.json");

		await writeJsonAtomic(filePath, { hello: "world", count: 1 });

		const content = await readFile(filePath, "utf8");
		expect(content.endsWith("\n")).toBe(true);
		expect(JSON.parse(content)).toEqual({ hello: "world", count: 1 });
	});

	it("reads JSON without schema", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-json-"));
		const filePath = join(dir, "data.json");
		await writeJsonAtomic(filePath, { hello: "world" });
		const data = await readJson<{ hello: string }>(filePath);
		expect(data.hello).toBe("world");
	});

	it("reads JSON with schema", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-json-"));
		const filePath = join(dir, "mission.json");
		await writeJsonAtomic(filePath, {
			schemaVersion: 1,
			id: "m1",
			name: "Mission",
			description: "Desc",
			status: "active",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
		const data = await readJson(filePath, missionSchema);
		expect(data.id).toBe("m1");
	});
});
