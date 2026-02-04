import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar, SidebarHeader } from "./sidebar";

describe("Sidebar", () => {
	const defaultProps = {
		children: <div data-testid="sidebar-content">Content</div>,
		missionsDir: "/test/workspace",
		sidebarCollapsed: false,
		onToggleCollapse: vi.fn(),
	};

	afterEach(() => {
		cleanup();
	});

	it("renders sidebar in expanded state", () => {
		render(<Sidebar {...defaultProps} />);
		expect(screen.getByText("Clawion")).toBeInTheDocument();
		expect(screen.getByText("Mission Board")).toBeInTheDocument();
		expect(screen.getByText("/test/workspace")).toBeInTheDocument();
	});

	it("renders sidebar in collapsed state", () => {
		const props = { ...defaultProps, sidebarCollapsed: true };
		render(<Sidebar {...props} />);
		// Clawion text is hidden when collapsed (only icon shown)
		expect(screen.queryByText("Clawion")).not.toBeInTheDocument();
		expect(screen.queryByText("Mission Board")).not.toBeInTheDocument();
		expect(screen.queryByText("/test/workspace")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /toggle sidebar/i }),
		).toBeInTheDocument();
	});

	it("calls onToggleCollapse when toggle button is clicked", () => {
		const onToggle = vi.fn();
		render(<Sidebar {...defaultProps} onToggleCollapse={onToggle} />);
		fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it("renders children content", () => {
		render(<Sidebar {...defaultProps} />);
		expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();
	});

	it("shows workspace directory when not collapsed", () => {
		render(<Sidebar {...defaultProps} />);
		expect(screen.getByText("Workspace")).toBeInTheDocument();
		expect(screen.getByText("/test/workspace")).toBeInTheDocument();
	});

	it("hides workspace directory when collapsed", () => {
		const props = { ...defaultProps, sidebarCollapsed: true };
		render(<Sidebar {...props} />);
		expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
	});
});

describe("SidebarHeader", () => {
	const defaultProps = {
		sidebarCollapsed: false,
		onToggleCollapse: vi.fn(),
	};

	afterEach(() => {
		cleanup();
	});

	it("renders header in expanded state", () => {
		render(<SidebarHeader {...defaultProps} />);
		expect(screen.getByText("Clawion")).toBeInTheDocument();
		expect(screen.getByText("Mission Board")).toBeInTheDocument();
	});

	it("renders toggle button", () => {
		render(<SidebarHeader {...defaultProps} />);
		expect(
			screen.getByRole("button", { name: /toggle sidebar/i }),
		).toBeInTheDocument();
	});

	it("hides title when collapsed", () => {
		const props = { ...defaultProps, sidebarCollapsed: true };
		render(<SidebarHeader {...props} />);
		expect(screen.queryByText("Clawion")).not.toBeInTheDocument();
		expect(screen.queryByText("Mission Board")).not.toBeInTheDocument();
	});

	it("still shows toggle button when collapsed", () => {
		const props = { ...defaultProps, sidebarCollapsed: true };
		render(<SidebarHeader {...props} />);
		expect(
			screen.getByRole("button", { name: /toggle sidebar/i }),
		).toBeInTheDocument();
	});
});
