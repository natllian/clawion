import { open, watch } from "node:fs/promises";

/**
 * Stream CLI invocation logs like `tail -f`.
 *
 * 1. Outputs existing content in a streaming fashion (no full-file memory load).
 * 2. Watches the file for new appends and prints them in real time.
 * 3. Runs until the process is killed (Ctrl-C).
 */
export async function logInvocations(filePath: string): Promise<void> {
	let position = 0;

	// Output existing content via streaming read
	try {
		const handle = await open(filePath, "r");
		try {
			const buf = Buffer.alloc(8192);
			let bytesRead: number;
			do {
				const result = await handle.read(buf, 0, buf.length, position);
				bytesRead = result.bytesRead;
				if (bytesRead > 0) {
					process.stdout.write(buf.subarray(0, bytesRead));
					position += bytesRead;
				}
			} while (bytesRead > 0);
		} finally {
			await handle.close();
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
			throw error;
		}
		// File doesn't exist yet — will be created by a future CLI invocation
	}

	// Watch for new content (tail -f)
	try {
		const watcher = watch(filePath);
		for await (const event of watcher) {
			if (event.eventType !== "change") continue;

			const handle = await open(filePath, "r");
			try {
				const buf = Buffer.alloc(8192);
				let bytesRead: number;
				do {
					const result = await handle.read(buf, 0, buf.length, position);
					bytesRead = result.bytesRead;
					if (bytesRead > 0) {
						process.stdout.write(buf.subarray(0, bytesRead));
						position += bytesRead;
					}
				} while (bytesRead > 0);
			} finally {
				await handle.close();
			}
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
			throw error;
		}
		// File was deleted or doesn't exist yet — fall back to polling
		console.error(
			"Log file not found. Run a clawion command first to create it.",
		);
		process.exitCode = 1;
	}
}
