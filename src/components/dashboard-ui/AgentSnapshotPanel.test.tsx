import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkingEvent } from "@/core/schemas";

vi.mock("./MarkdownBlock", () => ({
	MarkdownBlock: ({ content }: { content: string }) => (
		<div data-testid="markdown-block">{content}</div>
	),
}));

const { AgentSnapshotPanel, WorkingEventItem } = await import(
	"./AgentSnapshotPanel"
);

const mockWorking: WorkingEvent[] = [
	{
		id: "w1",
		agentId: "agent-1",
		createdAt: "2024-06-15T10:00:00Z",
		content: "Started task analysis",
	},
	{
		id: "w2",
		agentId: "agent-1",
		createdAt: "2024-06-15T11:00:00Z",
		content: "Completed initial review",
	},
];

const defaultProps = {
	roleDescription: "Frontend developer",
	onRoleDescriptionChange: vi.fn(),
	onRoleDescriptionSave: vi.fn().mockResolvedValue(undefined),
	savingRoleDescription: false,
	isActive: true,
	working: mockWorking,
	loadingWorking: false,
	darkSecret: "Knows the secret",
	onDarkSecretChange: vi.fn(),
	onDarkSecretSave: vi.fn().mockResolvedValue(undefined),
	savingDarkSecret: false,
};

describe("AgentSnapshotPanel", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	// --- Rendering ---
	it("renders role description section", () => {
		render(<AgentSnapshotPanel {...defaultProps} />);
		expect(screen.getByText("Role Description")).toBeInTheDocument();
	});

	it("renders dark secret section", () => {
		render(<AgentSnapshotPanel {...defaultProps} />);
		expect(screen.getByText("Dark Secret")).toBeInTheDocument();
		expect(screen.getByText(/Critical and private/)).toBeInTheDocument();
	});

	it("renders working events section", () => {
		render(<AgentSnapshotPanel {...defaultProps} />);
		expect(screen.getByText("Working")).toBeInTheDocument();
	});

	it("displays working events in reverse chronological order", () => {
		render(<AgentSnapshotPanel {...defaultProps} />);
		const blocks = screen.getAllByTestId("markdown-block");
		// Last event should appear first (reversed)
		expect(blocks[0]).toHaveTextContent("Completed initial review");
		expect(blocks[1]).toHaveTextContent("Started task analysis");
	});

	it("shows loading skeletons for working events", () => {
		const props = { ...defaultProps, loadingWorking: true };
		const { container } = render(<AgentSnapshotPanel {...props} />);
		const skeletons = container.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBe(3);
	});

	it("shows empty working state when active with no events", () => {
		const props = { ...defaultProps, working: [] };
		render(<AgentSnapshotPanel {...props} />);
		expect(screen.getByText("No working events yet.")).toBeInTheDocument();
	});

	it("shows inactive prompt when not active", () => {
		const props = { ...defaultProps, isActive: false, working: [] };
		render(<AgentSnapshotPanel {...props} />);
		expect(
			screen.getByText("Select an agent to load working events."),
		).toBeInTheDocument();
	});

	// --- Role Description Editing ---
	it("shows Edit button for role description", () => {
		render(<AgentSnapshotPanel {...defaultProps} />);
		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		expect(editButtons.length).toBeGreaterThanOrEqual(1);
	});

	it("disables role Edit button when not active", () => {
		const props = { ...defaultProps, isActive: false };
		render(<AgentSnapshotPanel {...props} />);
		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		for (const btn of editButtons) {
			expect(btn).toBeDisabled();
		}
	});

	it("shows role description value in textarea", () => {
		render(<AgentSnapshotPanel {...defaultProps} />);
		const textarea = screen.getByLabelText("Role description");
		expect(textarea).toHaveValue("Frontend developer");
	});

	it("textarea is disabled when not in editing mode", () => {
		render(<AgentSnapshotPanel {...defaultProps} />);
		const textarea = screen.getByLabelText("Role description");
		expect(textarea).toBeDisabled();
	});

	it("enables textarea after clicking Edit for role", async () => {
		render(<AgentSnapshotPanel {...defaultProps} />);
		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[0]); // First Edit is for role

		const textarea = screen.getByLabelText("Role description");
		expect(textarea).not.toBeDisabled();
	});

	it("shows Save/Cancel after clicking Edit for role", () => {
		render(<AgentSnapshotPanel {...defaultProps} />);
		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[0]);

		expect(
			screen.getAllByRole("button", { name: "Save" }).length,
		).toBeGreaterThanOrEqual(1);
		expect(
			screen.getAllByRole("button", { name: "Cancel" }).length,
		).toBeGreaterThanOrEqual(1);
	});

	it("calls onRoleDescriptionSave when Save is clicked", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const props = { ...defaultProps, onRoleDescriptionSave: onSave };
		render(<AgentSnapshotPanel {...props} />);

		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[0]);
		fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledTimes(1);
		});
	});

	it("exits editing mode after successful role save", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const props = { ...defaultProps, onRoleDescriptionSave: onSave };
		render(<AgentSnapshotPanel {...props} />);

		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[0]);
		fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

		await waitFor(() => {
			const textarea = screen.getByLabelText("Role description");
			expect(textarea).toBeDisabled();
		});
	});

	it("stays in editing mode when save fails", async () => {
		const onSave = vi.fn().mockRejectedValue(new Error("Save failed"));
		const props = { ...defaultProps, onRoleDescriptionSave: onSave };
		render(<AgentSnapshotPanel {...props} />);

		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[0]);
		fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

		await waitFor(() => {
			expect(onSave).toHaveBeenCalled();
		});
		// Should still be in editing mode
		const textarea = screen.getByLabelText("Role description");
		expect(textarea).not.toBeDisabled();
	});

	it("exits editing mode when Cancel is clicked", () => {
		render(<AgentSnapshotPanel {...defaultProps} />);

		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[0]);
		fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);

		const textarea = screen.getByLabelText("Role description");
		expect(textarea).toBeDisabled();
	});

	it("shows Saving... for role when saving", () => {
		const props = { ...defaultProps, savingRoleDescription: true };
		render(<AgentSnapshotPanel {...props} />);
		// Enter editing mode first
		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[0]);

		expect(screen.getByText("Saving...")).toBeInTheDocument();
	});

	// --- Dark Secret Editing ---
	it("shows dark secret value in textarea", () => {
		render(<AgentSnapshotPanel {...defaultProps} />);
		const textarea = screen.getByLabelText("Dark secret");
		expect(textarea).toHaveValue("Knows the secret");
	});

	it("enables dark secret textarea after clicking its Edit", () => {
		render(<AgentSnapshotPanel {...defaultProps} />);
		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[1]); // Second Edit is for dark secret

		const textarea = screen.getByLabelText("Dark secret");
		expect(textarea).not.toBeDisabled();
	});

	it("calls onDarkSecretSave when Save is clicked for secret", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const props = { ...defaultProps, onDarkSecretSave: onSave };
		render(<AgentSnapshotPanel {...props} />);

		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[1]);
		fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledTimes(1);
		});
	});

	it("stays in editing mode when secret save fails", async () => {
		const onSave = vi.fn().mockRejectedValue(new Error("Save failed"));
		const props = { ...defaultProps, onDarkSecretSave: onSave };
		render(<AgentSnapshotPanel {...props} />);

		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[1]);
		fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

		await waitFor(() => {
			expect(onSave).toHaveBeenCalled();
		});
		const textarea = screen.getByLabelText("Dark secret");
		expect(textarea).not.toBeDisabled();
	});

	// --- Inactive state ---
	it("shows empty values for textareas when not active", () => {
		const props = { ...defaultProps, isActive: false };
		render(<AgentSnapshotPanel {...props} />);
		expect(screen.getByLabelText("Role description")).toHaveValue("");
		expect(screen.getByLabelText("Dark secret")).toHaveValue("");
	});

	it("shows placeholder text for inactive role description", () => {
		const props = { ...defaultProps, isActive: false };
		render(<AgentSnapshotPanel {...props} />);
		expect(
			screen.getByPlaceholderText("Select an agent to edit role description."),
		).toBeInTheDocument();
	});

	it("fires onRoleDescriptionChange when textarea changes", () => {
		const onChange = vi.fn();
		const props = { ...defaultProps, onRoleDescriptionChange: onChange };
		render(<AgentSnapshotPanel {...props} />);

		// Enter editing mode
		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[0]);

		fireEvent.change(screen.getByLabelText("Role description"), {
			target: { value: "New role" },
		});
		expect(onChange).toHaveBeenCalledWith("New role");
	});

	it("fires onDarkSecretChange when dark secret textarea changes", () => {
		const onChange = vi.fn();
		const props = { ...defaultProps, onDarkSecretChange: onChange };
		render(<AgentSnapshotPanel {...props} />);

		const editButtons = screen.getAllByRole("button", { name: "Edit" });
		fireEvent.click(editButtons[1]);

		fireEvent.change(screen.getByLabelText("Dark secret"), {
			target: { value: "New secret" },
		});
		expect(onChange).toHaveBeenCalledWith("New secret");
	});
});

describe("WorkingEventItem (standalone)", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders event date and content", () => {
		const event: WorkingEvent = {
			id: "w1",
			agentId: "agent-1",
			createdAt: "2024-06-15T10:00:00Z",
			content: "Working on task",
		};
		render(<WorkingEventItem event={event} />);
		expect(screen.getByTestId("markdown-block")).toHaveTextContent(
			"Working on task",
		);
	});
});
