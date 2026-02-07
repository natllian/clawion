import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mission } from "@/core/schemas";

// Mock Radix DropdownMenu to render content inline (no portal)
vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-content">{children}</div>
	),
}));

vi.mock("./MarkdownBlock", () => ({
	MarkdownBlock: ({
		content,
		loading,
	}: {
		content: string;
		loading?: boolean;
	}) => (
		<div data-testid="markdown-block">
			{loading ? "Loading..." : content || "Empty"}
		</div>
	),
}));

const { SnapshotDropdown } = await import("./SnapshotDropdown");

const mockMission: Mission = {
	schemaVersion: 1,
	id: "m1",
	name: "Test Mission",
	status: "active",
	createdAt: "2024-06-15T10:00:00Z",
	updatedAt: "2024-06-20T15:30:00Z",
};

const defaultProps = {
	mission: mockMission as Mission | null,
	roadmapContent: "# My Roadmap\n\nStep 1: Do things",
	onRoadmapSave: vi.fn(),
	savingRoadmap: false,
	loadingMission: false,
};

describe("SnapshotDropdown", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders roadmap button", () => {
		render(<SnapshotDropdown {...defaultProps} />);
		expect(
			screen.getByRole("button", { name: /roadmap/i }),
		).toBeInTheDocument();
	});

	it("shows roadmap content", () => {
		render(<SnapshotDropdown {...defaultProps} />);
		expect(screen.getByTestId("markdown-block")).toHaveTextContent(
			"# My Roadmap",
		);
	});

	it("shows created and updated dates", () => {
		render(<SnapshotDropdown {...defaultProps} />);
		expect(screen.getByText(/Created/)).toBeInTheDocument();
		expect(screen.getByText(/Updated/)).toBeInTheDocument();
	});

	it("shows Edit button when mission is active", () => {
		render(<SnapshotDropdown {...defaultProps} />);
		expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
	});

	it("disables Edit button when no mission is selected", () => {
		const props = { ...defaultProps, mission: null };
		render(<SnapshotDropdown {...props} />);
		expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
	});

	it("disables Edit button while loading mission", () => {
		const props = { ...defaultProps, loadingMission: true };
		render(<SnapshotDropdown {...props} />);
		expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
	});

	it("switches to textarea when Edit is clicked", () => {
		render(<SnapshotDropdown {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		expect(screen.getByRole("textbox")).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toHaveValue(
			defaultProps.roadmapContent,
		);
	});

	it("shows Save and Cancel buttons in editing mode", () => {
		render(<SnapshotDropdown {...defaultProps} />);
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
	});

	it("calls onRoadmapSave with draft content when Save is clicked", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const props = { ...defaultProps, onRoadmapSave: onSave };
		render(<SnapshotDropdown {...props} />);

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		const textarea = screen.getByRole("textbox");
		fireEvent.change(textarea, { target: { value: "Updated roadmap" } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith("Updated roadmap");
		});
	});

	it("reverts to original content when Cancel is clicked", () => {
		render(<SnapshotDropdown {...defaultProps} />);

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		const textarea = screen.getByRole("textbox");
		fireEvent.change(textarea, { target: { value: "Draft content" } });
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		// Should go back to display mode
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		// toHaveTextContent normalizes whitespace, so just check key parts are present
		expect(screen.getByTestId("markdown-block")).toHaveTextContent(
			/My Roadmap/,
		);
		expect(screen.getByTestId("markdown-block")).toHaveTextContent(/Step 1/);
	});

	it("shows Saving... while save is in progress", () => {
		const props = { ...defaultProps, savingRoadmap: true };
		render(<SnapshotDropdown {...props} />);

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));

		expect(screen.getByText("Saving...")).toBeInTheDocument();
	});

	it("shows loading state via MarkdownBlock", () => {
		const props = { ...defaultProps, loadingMission: true };
		render(<SnapshotDropdown {...props} />);
		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	it("shows dashes for dates when no mission", () => {
		const props = { ...defaultProps, mission: null };
		render(<SnapshotDropdown {...props} />);
		const dateText = screen.getByText(/Created/).textContent;
		expect(dateText).toContain("\u2014"); // em dash —
	});

	it("exits editing mode after successful save", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const props = { ...defaultProps, onRoadmapSave: onSave };
		render(<SnapshotDropdown {...props} />);

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		});
	});

	it("stays in editing mode when save fails", async () => {
		const onSave = vi.fn().mockRejectedValue(new Error("Failed"));
		const props = { ...defaultProps, onRoadmapSave: onSave };
		render(<SnapshotDropdown {...props} />);

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalled();
		});
		// Should still be in editing mode
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});
});
