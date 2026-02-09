import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { resolveUiRuntimeDir, startUiServer } from "../src/cli/ui-server";

function createFakeChild(): ChildProcess {
	const emitter = new EventEmitter();
	const child = emitter as unknown as ChildProcess;
	child.on = emitter.on.bind(emitter) as ChildProcess["on"];
	return child;
}

describe("ui server runtime", () => {
	it("resolves packaged dist/ui runtime from compiled cli path", async () => {
		const root = await mkdtemp(join(tmpdir(), "clawion-ui-runtime-"));
		const runtimeDir = resolve(root, "dist/ui");
		await mkdir(runtimeDir, { recursive: true });
		await writeFile(resolve(runtimeDir, "server.js"), "console.log('ok');");

		const resolved = resolveUiRuntimeDir(
			`file://${resolve(root, "dist/bin/clawion.js")}`,
		);

		expect(resolved).toBe(runtimeDir);
	});

	it("falls back to repo dist/ui runtime from source cli path", async () => {
		const root = await mkdtemp(join(tmpdir(), "clawion-ui-runtime-src-"));
		const runtimeDir = resolve(root, "dist/ui");
		await mkdir(runtimeDir, { recursive: true });
		await writeFile(resolve(runtimeDir, "server.js"), "console.log('ok');");

		const resolved = resolveUiRuntimeDir(
			`file://${resolve(root, "bin/clawion.ts")}`,
		);

		expect(resolved).toBe(runtimeDir);
	});
});

describe("startUiServer", () => {
	it("returns actionable error when server entry is missing", () => {
		const result = startUiServer({
			runtimeDir: "/tmp/clawion-ui-missing",
		});

		expect(result.child).toBeUndefined();
		expect(result.errorMessage).toContain("Web UI runtime not found");
	});

	it("passes cwd and PORT to node spawn", async () => {
		const runtimeDir = await mkdtemp(join(tmpdir(), "clawion-ui-start-"));
		await writeFile(resolve(runtimeDir, "server.js"), "console.log('ok');");

		const spawnProcess = vi.fn(() => createFakeChild());

		const result = startUiServer({
			runtimeDir,
			port: "4310",
			spawnProcess,
			env: { ...process.env, TEST_ENV: "1" },
		});

		expect(result.errorMessage).toBeUndefined();
		expect(result.child).toBeDefined();
		expect(spawnProcess).toHaveBeenCalledTimes(1);
		expect(spawnProcess).toHaveBeenCalledWith("node", ["server.js"], {
			cwd: runtimeDir,
			stdio: "inherit",
			env: expect.objectContaining({
				PORT: "4310",
				TEST_ENV: "1",
			}),
		});
	});

	it("validates invalid port values", async () => {
		const runtimeDir = await mkdtemp(join(tmpdir(), "clawion-ui-port-"));
		await writeFile(resolve(runtimeDir, "server.js"), "console.log('ok');");

		const spawnProcess = vi.fn(() => createFakeChild());

		const result = startUiServer({
			runtimeDir,
			port: "abc",
			spawnProcess,
		});

		expect(result.child).toBeUndefined();
		expect(result.errorMessage).toContain('Invalid port "abc"');
		expect(spawnProcess).not.toHaveBeenCalled();
	});
});
