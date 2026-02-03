import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	MISSIONS_DIR_ENV,
	resolveMissionsDir,
} from "../src/core/workspace/paths";

describe("resolveMissionsDir", () => {
	it("prefers override path", () => {
		expect(resolveMissionsDir("/tmp/override")).toBe("/tmp/override");
	});

	it("falls back to env var when no override", () => {
		const original = process.env[MISSIONS_DIR_ENV];
		process.env[MISSIONS_DIR_ENV] = "/tmp/env-path";
		try {
			expect(resolveMissionsDir()).toBe("/tmp/env-path");
		} finally {
			if (original === undefined) {
				delete process.env[MISSIONS_DIR_ENV];
			} else {
				process.env[MISSIONS_DIR_ENV] = original;
			}
		}
	});

	it("defaults to home directory", () => {
		const original = process.env[MISSIONS_DIR_ENV];
		delete process.env[MISSIONS_DIR_ENV];
		try {
			expect(resolveMissionsDir()).toBe(
				join(homedir(), ".clawion", "missions"),
			);
		} finally {
			if (original === undefined) {
				delete process.env[MISSIONS_DIR_ENV];
			} else {
				process.env[MISSIONS_DIR_ENV] = original;
			}
		}
	});
});
