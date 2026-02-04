import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownBlock } from "./MarkdownBlock";

describe("MarkdownBlock", () => {
	afterEach(() => {
		cleanup();
	});

	it("shows loading state with spinner", () => {
		render(<MarkdownBlock content="Loading ROADMAP.md..." />);
		expect(screen.getByText("Loading roadmap...")).toBeInTheDocument();
		const loader = document.querySelector(".animate-spin");
		expect(loader).toBeInTheDocument();
	});

	it("renders markdown content when not loading", () => {
		render(<MarkdownBlock content="# Hello" />);
		expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
	});

	it("renders bold text from markdown", () => {
		render(<MarkdownBlock content="This is **bold** text." />);
		expect(screen.getByText("bold")).toBeInTheDocument();
	});

	it("renders links from markdown", () => {
		render(<MarkdownBlock content="[Click here](https://example.com)" />);
		const link = screen.getByRole("link", { name: /click here/i });
		expect(link).toHaveAttribute("href", "https://example.com");
	});
});
