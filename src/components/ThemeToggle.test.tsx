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
const { ThemeToggle } = await import("./ThemeToggle");

describe("ThemeToggle", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
		localStorageMock.getItem.mockReturnValue(null);
		document.documentElement.classList.remove("dark");
		delete document.documentElement.dataset.theme;
	});

	it("renders with custom className", () => {
		localStorageMock.getItem.mockReturnValue("light");
		const { container } = render(<ThemeToggle className="custom-class" />);
		const wrapper = container.firstChild;
		expect(wrapper).toHaveClass("custom-class");
	});

	it("applies light theme when stored value is light", () => {
		localStorageMock.getItem.mockReturnValue("light");
		const { container } = render(<ThemeToggle />);
		expect(
			container.querySelector('[aria-label="Toggle color theme"]'),
		).toBeInTheDocument();
		expect(document.documentElement.classList.contains("dark")).toBe(false);
		expect(document.documentElement.dataset.theme).toBe("light");
	});

	it("applies dark theme when stored value is dark", () => {
		localStorageMock.getItem.mockReturnValue("dark");
		const { container } = render(<ThemeToggle />);
		expect(
			container.querySelector('[aria-label="Toggle color theme"]'),
		).toBeInTheDocument();
		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(document.documentElement.dataset.theme).toBe("dark");
	});

	it("reads from localStorage on mount", () => {
		localStorageMock.getItem.mockReturnValue("dark");
		render(<ThemeToggle />);
		expect(localStorageMock.getItem).toHaveBeenCalledWith("clawion-theme");
	});

	it("falls back to prefers-color-scheme dark when no stored value", () => {
		localStorageMock.getItem.mockReturnValue(null);
		matchMediaMock.mockReturnValue({ matches: true });
		render(<ThemeToggle />);
		expect(matchMediaMock).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(document.documentElement.dataset.theme).toBe("dark");
	});

	it("falls back to light theme when no stored value and prefers-color-scheme is light", () => {
		localStorageMock.getItem.mockReturnValue(null);
		matchMediaMock.mockReturnValue({ matches: false });
		render(<ThemeToggle />);
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});
});
