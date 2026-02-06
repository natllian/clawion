import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";

export async function logInvocations(filePath: string): Promise<void> {
	let position = 0;

	// Get current file size and output existing content
	try {
		const stats = await stat(filePath);
		position = stats.size;
		if (position > 0) {
			const content = await readFile(filePath, "utf8");
			process.stdout.write(content);
		}
	} catch {
		// File doesn't exist yet, will wait for it
	}

	// Wait for and output new content
	const stream = createReadStream(filePath, {
		start: position,
		encoding: "utf8",
	});
	for await (const chunk of stream) {
		process.stdout.write(chunk);
	}
}
