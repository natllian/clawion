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

	it("has role=alert for accessibility", () => {
		render(<ErrorBanner error="Error message" />);
		const banner = screen.getByRole("alert");
		expect(banner).toBeInTheDocument();
		expect(banner).toHaveTextContent("Error message");
	});

	it("applies destructive styling", () => {
		render(<ErrorBanner error="Error message" />);
		const banner = screen.getByRole("alert");
		expect(banner).toHaveClass("border-destructive/40");
		expect(banner).toHaveClass("bg-destructive/10");
	});
});
