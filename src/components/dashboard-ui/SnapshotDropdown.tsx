"use client";

import { BookOpen } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Mission } from "@/core/schemas";
import { MarkdownBlock } from "./MarkdownBlock";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

function formatDate(value?: string) {
	if (!value) return "—";
	const normalized = /Z|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) return value;
	return dateFormatter.format(date);
}

interface SnapshotDropdownProps {
	mission: Mission | null;
	roadmapContent: string;
	onRoadmapSave: (content: string) => void | Promise<void>;
	savingRoadmap: boolean;
	loadingMission: boolean;
}

export function SnapshotDropdown({
	mission,
	roadmapContent,
	onRoadmapSave,
	savingRoadmap,
	loadingMission,
}: SnapshotDropdownProps) {
	const isEditable = Boolean(mission) && !loadingMission;
	const [isEditingRoadmap, setIsEditingRoadmap] = React.useState(false);
	const [roadmapDraft, setRoadmapDraft] = React.useState(roadmapContent);

	React.useEffect(() => {
		if (!isEditingRoadmap) {
			setRoadmapDraft(roadmapContent);
		}
	}, [isEditingRoadmap, roadmapContent]);

	async function handleSaveRoadmap() {
		await onRoadmapSave(roadmapDraft);
		setIsEditingRoadmap(false);
	}

	function handleCancelRoadmap() {
		setRoadmapDraft(roadmapContent);
		setIsEditingRoadmap(false);
	}

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm">
					<BookOpen className="h-4 w-4" />
					Roadmap
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[380px] p-3" sideOffset={8}>
				<DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
					Roadmap
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<div className="space-y-2">
					<div className="space-y-2">
						<div className="flex items-center justify-between gap-2">
							<div className="ml-auto flex items-center gap-2">
								{isEditingRoadmap ? (
									<>
										<Button
											type="button"
											size="xs"
											variant="ghost"
											onClick={handleCancelRoadmap}
											disabled={savingRoadmap}
										>
											Cancel
										</Button>
										<Button
											type="button"
											size="xs"
											onClick={handleSaveRoadmap}
											disabled={!isEditable || savingRoadmap}
											className="shrink-0"
										>
											{savingRoadmap ? "Saving..." : "Save"}
										</Button>
									</>
								) : (
									<Button
										type="button"
										size="xs"
										variant="outline"
										onClick={() => setIsEditingRoadmap(true)}
										disabled={!isEditable}
									>
										Edit
									</Button>
								)}
							</div>
						</div>
						{isEditingRoadmap ? (
							<textarea
								value={isEditable ? roadmapDraft : ""}
								onChange={(event) => setRoadmapDraft(event.target.value)}
								disabled={!isEditable || savingRoadmap}
								placeholder={
									isEditable
										? "Write roadmap markdown..."
										: "Select a mission to edit roadmap."
								}
								className="scrollbar-dropdown min-h-[300px] h-[52vh] max-h-[540px] w-full resize-none rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground outline-none ring-ring/50 placeholder:text-muted-foreground focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60"
							/>
						) : (
							<div className="rounded-lg border border-border/70 bg-background p-2">
								<MarkdownBlock content={roadmapContent} />
							</div>
						)}
					</div>
					<p className="text-[0.65rem] text-muted-foreground">
						Created {formatDate(mission?.createdAt)} · Updated{" "}
						{formatDate(mission?.updatedAt)}
					</p>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
