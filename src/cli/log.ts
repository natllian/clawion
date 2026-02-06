import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";

export async function logInvocations(filePath: string): Promise<void> {
	let position = 0;

	// Output existing content
	try {
		const content = await readFile(filePath, "utf8");
		if (content) {
			process.stdout.write(content);
			position = content.length;
		}
	} catch {
		// File doesn't exist yet
	}

	// Follow for new content
	const stream = createReadStream(filePath, { start: position });
	for await (const chunk of stream) {
		process.stdout.write(chunk);
	}
}
