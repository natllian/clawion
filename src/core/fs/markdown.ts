import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function writeMarkdownAtomic(
	filePath: string,
	content: string,
): Promise<void> {
	const dir = dirname(filePath);
	await mkdir(dir, { recursive: true });
	const tmpPath = join(
		dir,
		`.${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`,
	);
	const normalized = content.endsWith("\n") ? content : `${content}\n`;
	await writeFile(tmpPath, normalized, "utf8");
	await rename(tmpPath, filePath);
}
