import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorBanner } from "./ErrorBanner";

describe("ErrorBanner", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders nothing when no error", () => {
		const { container } = render(<ErrorBanner error={null} />);
		expect(container).toBeEmptyDOMElement();
	});

	it("displays error message when error is present", () => {
		render(<ErrorBanner error="Something went wrong" />);
		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
	});

	it("has error styling classes", () => {
		render(<ErrorBanner error="Error message" />);
		const banner = screen.getByText("Error message").closest("div");
		expect(banner).toHaveClass("px-6");
		expect(banner).toHaveClass("text-destructive");
	});
});
