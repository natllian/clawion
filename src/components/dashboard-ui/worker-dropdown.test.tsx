import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkersFile } from "@/core/schemas";

// Dynamic import to apply mocks before testing
const { WorkerDropdown: TestedWorkerDropdown } = await import(
	"./worker-dropdown"
);

// Test LogEvent separately in its own test file for isolation
describe("WorkerDropdown - rendering", () => {
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
});
