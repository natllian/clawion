import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";

export async function readJson<T>(
	filePath: string,
	schema?: ZodSchema<T>,
): Promise<T> {
	const raw = await readFile(filePath, "utf8");
	const data = JSON.parse(raw) as T;
	if (!schema) {
		return data;
	}
	try {
		return schema.parse(data);
	} catch (error) {
		if (error instanceof ZodError) {
			const issues = error.issues
				.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
				.join("\n");
			throw new Error(`Validation failed for ${filePath}:\n${issues}`);
		}
		throw error;
	}
}

export async function writeJsonAtomic(
	filePath: string,
	data: unknown,
): Promise<void> {
	const dir = dirname(filePath);
	await mkdir(dir, { recursive: true });
	const tmpPath = join(
		dir,
		`.${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`,
	);
	const payload = `${JSON.stringify(data, null, 2)}\n`;
	await writeFile(tmpPath, payload, "utf8");
	await rename(tmpPath, filePath);
}
