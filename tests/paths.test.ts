import { describe, expect, it } from "vitest";
import {
	resolveMissionsDir,
	resolveWorkspaceDir,
	WORKSPACE_ENV,
} from "../src/core/workspace/paths";

describe("paths", () => {
	describe("resolveWorkspaceDir", () => {
		it("uses override parameter when provided", () => {
			const result = resolveWorkspaceDir("/custom/path");
			expect(result).toBe("/custom/path");
		});

		it("uses override parameter even when env var is set", () => {
			const envPath = process.env[WORKSPACE_ENV];
			try {
				process.env[WORKSPACE_ENV] = "/env/path";
				const result = resolveWorkspaceDir("/override/path");
				expect(result).toBe("/override/path");
			} finally {
				if (envPath !== undefined) {
					process.env[WORKSPACE_ENV] = envPath;
				} else {
					delete process.env[WORKSPACE_ENV];
				}
			}
		});

		it("uses env var when override is not provided", () => {
			const envPath = process.env[WORKSPACE_ENV];
			try {
				process.env[WORKSPACE_ENV] = "/env/path";
				const result = resolveWorkspaceDir();
				expect(result).toBe("/env/path");
			} finally {
				if (envPath !== undefined) {
					process.env[WORKSPACE_ENV] = envPath;
				} else {
					delete process.env[WORKSPACE_ENV];
				}
			}
		});

		it("ignores env var with empty string", () => {
			const envPath = process.env[WORKSPACE_ENV];
			try {
				process.env[WORKSPACE_ENV] = "";
				const result = resolveWorkspaceDir();
				expect(result).toContain(".clawion");
			} finally {
				if (envPath !== undefined) {
					process.env[WORKSPACE_ENV] = envPath;
				} else {
					delete process.env[WORKSPACE_ENV];
				}
			}
		});

		it("ignores env var with only whitespace", () => {
			const envPath = process.env[WORKSPACE_ENV];
			try {
				process.env[WORKSPACE_ENV] = "   ";
				const result = resolveWorkspaceDir();
				expect(result).toContain(".clawion");
			} finally {
				if (envPath !== undefined) {
					process.env[WORKSPACE_ENV] = envPath;
				} else {
					delete process.env[WORKSPACE_ENV];
				}
			}
		});

		it("falls back to homedir/.clawion when no override or env var", () => {
			const envPath = process.env[WORKSPACE_ENV];
			try {
				delete process.env[WORKSPACE_ENV];
				const result = resolveWorkspaceDir();
				expect(result).toContain(".clawion");
			} finally {
				if (envPath !== undefined) {
					process.env[WORKSPACE_ENV] = envPath;
				}
			}
		});
	});

	describe("resolveMissionsDir", () => {
		it("returns missions subdirectory of workspace", () => {
			// We can't easily mock resolveWorkspaceDir, so we verify the structure
			// by checking that it contains 'missions' at the end
			const result = resolveMissionsDir();
			expect(result.endsWith("missions")).toBe(true);
		});
	});
});
