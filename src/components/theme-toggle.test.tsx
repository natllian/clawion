import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
};
Object.defineProperty(global, "localStorage", {
	value: localStorageMock,
	writable: true,
});

// Mock matchMedia
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
	matches: query === "(prefers-color-scheme: dark)",
	media: query,
	onchange: null,
	addListener: vi.fn(),
	removeListener: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
}));
Object.defineProperty(global, "matchMedia", {
	value: matchMediaMock,
	writable: true,
});

// Dynamic import to apply mocks before testing
const { ThemeToggle } = await import("./theme-toggle");

describe("ThemeToggle", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
		localStorageMock.getItem.mockReturnValue(null);
	});

	it("renders with custom className", () => {
		localStorageMock.getItem.mockReturnValue("light");
		const { container } = render(<ThemeToggle className="custom-class" />);
		const wrapper = container.firstChild;
		expect(wrapper).toHaveClass("custom-class");
	});

	it("renders light theme by default", () => {
		localStorageMock.getItem.mockReturnValue("light");
		const { container } = render(<ThemeToggle />);
		// After mounting, should show the toggle
		expect(
			container.querySelector('[aria-label="Toggle color theme"]'),
		).toBeInTheDocument();
	});

	it("renders dark theme when stored", () => {
		localStorageMock.getItem.mockReturnValue("dark");
		const { container } = render(<ThemeToggle />);
		const switchElement = container.querySelector(
			'[aria-label="Toggle color theme"]',
		);
		expect(switchElement).toBeInTheDocument();
	});

	it("applies custom className", () => {
		localStorageMock.getItem.mockReturnValue("light");
		const { container } = render(<ThemeToggle className="custom-class" />);
		const wrapper = container.firstChild;
		expect(wrapper).toHaveClass("custom-class");
	});

	it("reads from localStorage on mount", () => {
		localStorageMock.getItem.mockReturnValue("dark");
		render(<ThemeToggle />);
		expect(localStorageMock.getItem).toHaveBeenCalledWith("clawion-theme");
	});

	it("uses prefers-color-scheme when no stored value", () => {
		localStorageMock.getItem.mockReturnValue(null);
		matchMediaMock.mockReturnValue({ matches: true });
		render(<ThemeToggle />);
		expect(matchMediaMock).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
	});
});
