import { describe, expect, it } from "vitest";
import { formatLocalTime, nowLocal } from "../src/core/time";

describe("time", () => {
	describe("nowLocal", () => {
		it("returns a string", () => {
			const result = nowLocal();
			expect(typeof result).toBe("string");
		});

		it("matches expected format YYYY-MM-DDTHH:mm:ss.SSSZ", () => {
			const result = nowLocal();
			// Format: 2026-02-06T17:31:31.302+08:00
			expect(result).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
			);
		});

		it("includes timezone offset", () => {
			const result = nowLocal();
			expect(result).toContain("+") || expect(result).toContain("-");
		});
	});

	describe("formatLocalTime", () => {
		it("formats a specific date correctly", () => {
			const date = new Date("2026-02-15T10:30:00.123Z");
			const result = formatLocalTime(date);
			// The result should be in local time with timezone offset
			expect(result).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
			);
		});

		it("includes milliseconds", () => {
			const date = new Date("2026-02-15T10:30:00.123Z");
			const result = formatLocalTime(date);
			expect(result).toContain(".123");
		});

		it("handles undefined date", () => {
			const result = formatLocalTime();
			expect(typeof result).toBe("string");
			expect(result).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
			);
		});
	});
});
