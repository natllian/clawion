import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readJson } from "../src/core/fs/json";

describe("readJson validation errors", () => {
	it("throws with validation details for invalid data", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-json-"));
		const filePath = join(dir, "invalid.json");
		await writeFile(filePath, JSON.stringify({ id: 123, name: "test" }));

		const schema = z.object({
			id: z.string(),
			name: z.string(),
		});

		try {
			await readJson(filePath, schema);
			expect(false).toBe(true);
		} catch (error) {
			expect(error instanceof Error).toBe(true);
			expect((error as Error).message).toContain("Validation failed");
			expect((error as Error).message).toContain(filePath);
		}
	});
});
