import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export type LogOptions = {
	follow: boolean;
};

export async function logInvocations(
	filePath: string,
	options: LogOptions,
): Promise<void> {
	const fileName = basename(filePath);
	console.log(`--- tailing ${fileName} (Ctrl+C to exit) ---\n`);

	if (options.follow) {
		let position = 0;

		// First, read existing content
		try {
			const content = await readFile(filePath, "utf8");
			if (content) {
				console.log(content);
				position = content.length;
			}
		} catch {
			// File doesn't exist yet, that's fine
		}

		// Then follow for new content
		const stream = createReadStream(filePath, { start: position });
		for await (const chunk of stream) {
			process.stdout.write(chunk);
		}
	} else {
		try {
			const content = await readFile(filePath, "utf8");
			console.log(content || "(no logs yet)");
		} catch {
			console.log("(no logs yet)");
		}
	}
}
