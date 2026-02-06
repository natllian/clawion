import { describe, expect, it } from "vitest";
import { formatLocalTime, nowLocal } from "../src/core/time";

describe("time", () => {
	describe("nowLocal", () => {
		it("returns a string", () => {
			const result = nowLocal();
			expect(typeof result).toBe("string");
		});

		it("matches expected format YYYY-MM-DD HH-mm-ss", () => {
			const result = nowLocal();
			// Format: 2026-02-06 17-31-37
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2}$/);
		});
	});

	describe("formatLocalTime", () => {
		it("formats a specific date correctly", () => {
			const date = new Date("2026-02-15T10:30:00.123Z");
			const result = formatLocalTime(date);
			// The result should be in local time without timezone offset
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2}$/);
		});

		it("handles undefined date", () => {
			const result = formatLocalTime();
			expect(typeof result).toBe("string");
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2}$/);
		});
	});
});
