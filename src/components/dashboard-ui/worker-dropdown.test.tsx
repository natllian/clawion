import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkersFile } from "@/core/schemas";

// Dynamic import to apply mocks before testing
const { WorkerDropdown: TestedWorkerDropdown } = await import(
	"./worker-dropdown"
);

const mockWorkers: WorkersFile = {
	schemaVersion: 1,
	workers: [
		{
			id: "w1",
			displayName: "Alice",
			systemRole: "worker",
			status: "active",
			roleDescription: "Frontend developer",
		},
		{
			id: "manager-1",
			displayName: "Bob",
			systemRole: "manager",
			status: "active",
			roleDescription: "Project manager",
		},
	],
};

const defaultProps = {
	workers: mockWorkers,
	loadingMission: false,
	activeWorkerId: null as string | null,
	onWorkerSelect: vi.fn(),
	working: "",
	log: null,
	loadingWorker: false,
};

describe("WorkerDropdown - rendering", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders worker names", () => {
		render(<TestedWorkerDropdown {...defaultProps} />);
		expect(screen.getByText("Alice")).toBeInTheDocument();
		expect(screen.getByText("Bob")).toBeInTheDocument();
	});

	it("shows loading skeletons when loading mission", () => {
		const props = { ...defaultProps, loadingMission: true };
		const { container } = render(<TestedWorkerDropdown {...props} />);
		const skeletons = container.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThanOrEqual(4);
	});

	it("shows empty state when no workers", () => {
		const emptyWorkers: WorkersFile = { schemaVersion: 1, workers: [] };
		const props = {
			...defaultProps,
			workers: emptyWorkers,
		};
		render(<TestedWorkerDropdown {...props} />);
		expect(screen.getByText("No workers yet.")).toBeInTheDocument();
	});

	it("renders worker avatars", () => {
		render(<TestedWorkerDropdown {...defaultProps} />);
		const avatars = document.querySelectorAll("[data-slot='avatar']");
		expect(avatars).toHaveLength(2);
	});

	it("shows both worker buttons", () => {
		render(<TestedWorkerDropdown {...defaultProps} />);
		const buttons = document.querySelectorAll("button[type='button']");
		expect(buttons.length).toBeGreaterThanOrEqual(2);
	});

	it("calls onWorkerSelect when clicking worker button", () => {
		const onWorkerSelect = vi.fn();
		const props = {
			...defaultProps,
			onWorkerSelect,
		};
		render(<TestedWorkerDropdown {...props} />);
		const buttons = document.querySelectorAll("button[type='button']");
		const bobButton = Array.from(buttons).find((btn) =>
			btn.textContent?.includes("Bob"),
		) as HTMLButtonElement | undefined;
		bobButton?.click();
		expect(onWorkerSelect).toHaveBeenCalledWith("manager-1");
	});

	it("shows initials for each worker", () => {
		render(<TestedWorkerDropdown {...defaultProps} />);
		// Avatars show initials
		const avatars = document.querySelectorAll("[data-slot='avatar-fallback']");
		expect(avatars).toHaveLength(2);
		// First avatar shows "A" for Alice
		expect(avatars[0]).toHaveTextContent("A");
		// Second avatar shows "B" for Bob
		expect(avatars[1]).toHaveTextContent("B");
	});

	it("renders worker buttons with correct roles", () => {
		render(<TestedWorkerDropdown {...defaultProps} />);
		const buttons = document.querySelectorAll(
			"[data-slot='dropdown-menu-trigger']",
		);
		expect(buttons).toHaveLength(2);
	});
});
