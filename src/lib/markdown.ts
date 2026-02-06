const ESCAPED_NEWLINE_PATTERN = /\\n/g;
const ESCAPED_CONTROL_PATTERN = /\\[nrt]/;

function countMatches(value: string, pattern: RegExp): number {
	return value.match(pattern)?.length ?? 0;
}

export function normalizeMarkdownContent(content: string): string {
	const normalizedLineEndings = content.replace(/\r\n?/g, "\n");

	if (!ESCAPED_CONTROL_PATTERN.test(normalizedLineEndings)) {
		return normalizedLineEndings;
	}

	const escapedNewlineCount = countMatches(
		normalizedLineEndings,
		ESCAPED_NEWLINE_PATTERN,
	);
	if (escapedNewlineCount === 0) {
		return normalizedLineEndings;
	}

	const actualNewlineCount = countMatches(normalizedLineEndings, /\n/g);
	const shouldDecodeEscapes =
		actualNewlineCount === 0 || escapedNewlineCount > actualNewlineCount;

	if (!shouldDecodeEscapes) {
		return normalizedLineEndings;
	}

	return normalizedLineEndings
		.replace(/\\r\\n/g, "\n")
		.replace(/\\n/g, "\n")
		.replace(/\\r/g, "\r")
		.replace(/\\t/g, "\t");
}
