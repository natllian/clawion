import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logInvocations } from "../src/cli/log";

describe("logInvocations", () => {
	const stdoutChunks: string[] = [];
	const originalWrite = process.stdout.write;

	afterEach(() => {
		process.stdout.write = originalWrite;
		stdoutChunks.length = 0;
		vi.restoreAllMocks();
	});

	function captureStdout() {
		process.stdout.write = ((chunk: unknown) => {
			stdoutChunks.push(
				chunk instanceof Buffer ? chunk.toString() : String(chunk),
			);
			return true;
		}) as typeof process.stdout.write;
	}

	it("streams existing file content to stdout", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-log-"));
		const filePath = join(dir, "invocations.log");
		const content = "line1\nline2\nline3\n";
		await writeFile(filePath, content);

		captureStdout();

		// logInvocations will read existing content then block on watch.
		// We need to abort it after the initial read.
		logInvocations(filePath);

		// Give it a moment to finish reading existing content
		await new Promise((resolve) => setTimeout(resolve, 100));

		// The function is blocked on fs.watch; check captured output from initial read.
		const output = stdoutChunks.join("");
		expect(output).toBe(content);
	});

	it("handles missing file gracefully (ENOENT)", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-log-"));
		const filePath = join(dir, "nonexistent.log");

		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		captureStdout();

		// logInvocations should catch ENOENT for both open and watch
		await logInvocations(filePath);

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"Log file not found. Run a clawion command first to create it.",
		);
		expect(process.exitCode).toBe(1);

		// Reset
		process.exitCode = 0;
	});

	it("streams large content in chunks without loading full file", async () => {
		const dir = await mkdtemp(join(tmpdir(), "clawion-log-"));
		const filePath = join(dir, "large.log");

		// Create a file larger than the 8KB buffer
		const bigContent = `${"x".repeat(20000)}\n`;
		await writeFile(filePath, bigContent);

		captureStdout();

		logInvocations(filePath);
		await new Promise((resolve) => setTimeout(resolve, 150));

		const output = stdoutChunks.join("");
		expect(output).toBe(bigContent);
		// Verify it was read in multiple chunks
		expect(stdoutChunks.length).toBeGreaterThan(1);
	});
});
