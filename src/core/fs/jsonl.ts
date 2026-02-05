import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";
import { pathExists } from "./util";

export async function readJsonLines<T>(
	filePath: string,
	schema?: ZodSchema<T>,
): Promise<T[]> {
	if (!(await pathExists(filePath))) {
		return [];
	}

	const raw = await readFile(filePath, "utf8");
	const lines = raw
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	const entries: T[] = [];

	for (const [index, line] of lines.entries()) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch (error) {
			throw new Error(
				`Invalid JSONL at ${filePath}:${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		if (!schema) {
			entries.push(parsed as T);
			continue;
		}

		try {
			entries.push(schema.parse(parsed));
		} catch (error) {
			if (error instanceof ZodError) {
				const issues = error.issues
					.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
					.join("\n");
				throw new Error(
					`Validation failed for ${filePath}:${index + 1}:\n${issues}`,
				);
			}
			throw error;
		}
	}

	return entries;
}

export async function appendJsonLine(
	filePath: string,
	data: unknown,
): Promise<void> {
	await mkdir(dirname(filePath), { recursive: true });
	await appendFile(filePath, `${JSON.stringify(data)}\n`, "utf8");
}
