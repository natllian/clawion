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
		await mkdir(resolve(runtimeDir, ".next"), { recursive: true });
		await writeFile(resolve(runtimeDir, ".next/BUILD_ID"), "build");
		await writeFile(resolve(root, "package.json"), "{}");

		const resolved = resolveUiRuntimeDir(
			`file://${resolve(root, "dist/bin/clawion.js")}`,
		);

		expect(resolved).toBe(runtimeDir);
	});

	it("falls back to repo dist/ui runtime from source cli path", async () => {
		const root = await mkdtemp(join(tmpdir(), "clawion-ui-runtime-src-"));
		await mkdir(resolve(root, ".next"), { recursive: true });
		await writeFile(resolve(root, ".next/BUILD_ID"), "build");
		await writeFile(resolve(root, "package.json"), "{}");

		const resolved = resolveUiRuntimeDir(
			`file://${resolve(root, "bin/clawion.ts")}`,
		);

		expect(resolved).toBe(root);
	});
});

describe("startUiServer", () => {
	it("returns actionable error when build output is missing", () => {
		const result = startUiServer({
			runtimeDir: "/tmp/clawion-ui-missing",
		});

		expect(result.child).toBeUndefined();
		expect(result.errorMessage).toContain("Web UI build output not found");
	});

	it("returns actionable error when next cli is missing", async () => {
		const runtimeDir = await mkdtemp(join(tmpdir(), "clawion-ui-runtime-"));
		await mkdir(resolve(runtimeDir, ".next"), { recursive: true });
		await writeFile(resolve(runtimeDir, ".next/BUILD_ID"), "build");

		const result = startUiServer({
			runtimeDir,
			packageRootDir: runtimeDir,
		});

		expect(result.child).toBeUndefined();
		expect(result.errorMessage).toContain("Next.js CLI not found");
	});

	it("passes cwd and PORT to node spawn", async () => {
		const packageRootDir = await mkdtemp(join(tmpdir(), "clawion-ui-start-"));
		const runtimeDir = resolve(packageRootDir, "dist/ui");
		const nextBinPath = resolve(
			packageRootDir,
			"node_modules/next/dist/bin/next",
		);
		await mkdir(resolve(runtimeDir, ".next"), { recursive: true });
		await writeFile(resolve(runtimeDir, ".next/BUILD_ID"), "build");
		await mkdir(resolve(nextBinPath, ".."), { recursive: true });
		await writeFile(nextBinPath, "console.log('next');");

		const spawnProcess = vi.fn(() => createFakeChild());

		const result = startUiServer({
			runtimeDir,
			packageRootDir,
			nextBinPath,
			port: "4310",
			spawnProcess,
			env: { ...process.env, TEST_ENV: "1" },
		});

		expect(result.errorMessage).toBeUndefined();
		expect(result.child).toBeDefined();
		expect(spawnProcess).toHaveBeenCalledTimes(1);
		expect(spawnProcess).toHaveBeenCalledWith(
			process.execPath,
			[nextBinPath, "start", runtimeDir, "-p", "4310"],
			{
				cwd: packageRootDir,
				stdio: "inherit",
				env: expect.objectContaining({
					TEST_ENV: "1",
				}),
			},
		);
	});

	it("validates invalid port values", async () => {
		const packageRootDir = await mkdtemp(join(tmpdir(), "clawion-ui-port-"));
		const runtimeDir = resolve(packageRootDir, "dist/ui");
		const nextBinPath = resolve(
			packageRootDir,
			"node_modules/next/dist/bin/next",
		);
		await mkdir(resolve(runtimeDir, ".next"), { recursive: true });
		await writeFile(resolve(runtimeDir, ".next/BUILD_ID"), "build");
		await mkdir(resolve(nextBinPath, ".."), { recursive: true });
		await writeFile(nextBinPath, "console.log('next');");

		const spawnProcess = vi.fn(() => createFakeChild());

		const result = startUiServer({
			runtimeDir,
			packageRootDir,
			nextBinPath,
			port: "abc",
			spawnProcess,
		});

		expect(result.child).toBeUndefined();
		expect(result.errorMessage).toContain('Invalid port "abc"');
		expect(spawnProcess).not.toHaveBeenCalled();
	});

	it("spawns without port when no port is provided", async () => {
		const packageRootDir = await mkdtemp(join(tmpdir(), "clawion-ui-np-"));
		const runtimeDir = resolve(packageRootDir, "dist/ui");
		const nextBinPath = resolve(
			packageRootDir,
			"node_modules/next/dist/bin/next",
		);
		await mkdir(resolve(runtimeDir, ".next"), { recursive: true });
		await writeFile(resolve(runtimeDir, ".next/BUILD_ID"), "build");
		await mkdir(resolve(nextBinPath, ".."), { recursive: true });
		await writeFile(nextBinPath, "console.log('next');");

		const spawnProcess = vi.fn(() => createFakeChild());

		const result = startUiServer({
			runtimeDir,
			packageRootDir,
			nextBinPath,
			env: { ...process.env, TEST_ENV: "2" },
			spawnProcess,
		});

		expect(result.errorMessage).toBeUndefined();
		expect(result.child).toBeDefined();
		expect(spawnProcess).toHaveBeenCalledWith(
			process.execPath,
			[nextBinPath, "start", runtimeDir],
			{
				cwd: packageRootDir,
				stdio: "inherit",
				env: expect.objectContaining({
					TEST_ENV: "2",
				}),
			},
		);
	});
});
