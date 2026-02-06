import { describe, expect, it } from "vitest";
import { normalizeMarkdownContent } from "./markdown";

describe("normalizeMarkdownContent", () => {
	it("decodes escaped newlines when content appears double-escaped", () => {
		expect(normalizeMarkdownContent("Line 1\\nLine 2")).toBe("Line 1\nLine 2");
	});

	it("normalizes CRLF line endings", () => {
		expect(normalizeMarkdownContent("Line 1\r\nLine 2")).toBe("Line 1\nLine 2");
	});

	it("keeps content unchanged when escaped newlines are sparse", () => {
		const value = "Line 1\nLine 2\\nregex";
		expect(normalizeMarkdownContent(value)).toBe(value);
	});
});
