import { join } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { readJson } from "@/core/fs/json";
import { missionSchema, tasksSchema, workersSchema } from "@/core/schemas";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { getThread } from "@/core/workspace/threads";
import { cn } from "@/lib/utils";

function formatDate(value?: string) {
	if (!value) {
		return "—";
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

function getInitials(value: string) {
	return value
		.split(/\s+/)
		.map((word) => word.charAt(0))
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

type RouteParams = {
	missionId: string;
	taskId: string;
};

export default async function TaskThreadPage({
	params,
}: {
	params: Promise<RouteParams> | RouteParams;
}) {
	const { missionId, taskId } = await params;
	const missionsDir = resolveMissionsDir();
	const missionPath = await resolveMissionPath(missionsDir, missionId);

	const [mission, tasksFile, workersFile, thread] = await Promise.all([
		readJson(join(missionPath, "mission.json"), missionSchema),
		readJson(join(missionPath, "tasks.json"), tasksSchema),
		readJson(join(missionPath, "workers.json"), workersSchema),
		getThread(missionsDir, missionId, taskId),
	]);

	const task = tasksFile.tasks.find((entry) => entry.id === taskId);
	if (!task) {
		notFound();
	}

	const column = tasksFile.columns.find((entry) => entry.id === task.columnId);
	const statusNotes = task.statusNotes ?? "";
	const isBlocked = statusNotes.toLowerCase().startsWith("blocked:");
	const workerMap = new Map(
		workersFile.workers.map((worker) => [worker.id, worker.displayName]),
	);
	const assigneeLabel = task.assigneeId
		? (workerMap.get(task.assigneeId) ?? task.assigneeId)
		: "Unassigned";
	const threadOpen = thread.messages.some((message) => !message.resolved);

	const participants = new Set<string>();
	thread.messages.forEach((message) => {
		participants.add(message.authorId);
		participants.add(message.mentions);
	});

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
				<nav className="text-xs text-muted-foreground">
					<Link href="/" className="hover:text-foreground">
						Missions
					</Link>
					<span className="mx-2">/</span>
					<span className="font-medium text-foreground">{mission.name}</span>
				</nav>

				<section className="rounded-2xl border border-border/70 bg-card p-5">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-3">
								<h1 className="text-2xl font-semibold text-foreground">
									{task.title}
								</h1>
								<span className="text-sm text-muted-foreground">
									#{task.id}
								</span>
								<Badge
									variant="outline"
									className={cn(
										"rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
										threadOpen
											? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
											: "border-border/70 text-muted-foreground",
									)}
								>
									{threadOpen ? "Open" : "Resolved"}
								</Badge>
							</div>
							<p className="mt-2 text-sm text-muted-foreground">
								{task.description}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge
								variant="outline"
								className="rounded-full border-border/70 bg-muted/60 px-2 py-0.5 text-[0.65rem] font-medium text-foreground/80"
							>
								{column?.name ?? task.columnId}
							</Badge>
							{isBlocked ? (
								<Badge
									variant="destructive"
									className="rounded-full px-2 py-0.5 text-[0.65rem] font-medium"
								>
									Blocked
								</Badge>
							) : null}
						</div>
					</div>

					<Separator className="my-4" />

					<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
						<span>Created {formatDate(task.createdAt)}</span>
						<span>Updated {formatDate(task.updatedAt)}</span>
						<span className="text-[0.65rem] text-muted-foreground">
							Assigned
						</span>
						<span className="inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-0.5 text-[0.65rem] font-medium text-foreground">
							{assigneeLabel}
						</span>
					</div>
					{statusNotes ? (
						<p className="mt-2 text-sm text-muted-foreground">{statusNotes}</p>
					) : null}
				</section>

				<div className="grid gap-6 lg:grid-cols-[1.8fr_0.7fr]">
					<main className="space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold">Thread</h2>
							<span className="text-xs text-muted-foreground">
								{thread.messages.length} messages
							</span>
						</div>
						<div className="relative">
							<div className="absolute left-4 top-0 h-full w-px bg-border" />
							<div className="flex flex-col gap-4">
								{thread.messages.length === 0 ? (
									<div className="rounded-xl border border-border/70 bg-card p-4 text-sm text-muted-foreground">
										No thread messages yet.
									</div>
								) : (
									thread.messages.map((message) => {
										const authorLabel =
											workerMap.get(message.authorId) ?? message.authorId;
										const mentionsLabel =
											workerMap.get(message.mentions) ?? message.mentions;
										return (
											<div key={message.id} className="relative flex gap-3">
												<Avatar className="z-10 mt-1">
													<AvatarFallback>
														{getInitials(authorLabel)}
													</AvatarFallback>
												</Avatar>
												<div className="flex-1 rounded-xl border border-border/70 bg-card">
													<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-2 text-xs">
														<div className="flex flex-wrap items-center gap-2">
															<span className="font-medium text-foreground">
																{authorLabel}
															</span>
															<span className="text-muted-foreground">
																to @{mentionsLabel}
															</span>
														</div>
														<Badge
															variant="outline"
															className="rounded-full border-border/70 bg-muted/60 px-2 py-0.5 text-[0.6rem] font-medium text-foreground/80"
														>
															{message.resolved ? "Resolved" : "Open"}
														</Badge>
													</div>
													<div className="px-3 py-3 text-sm text-foreground">
														{message.content}
													</div>
													<div className="border-t border-border/70 px-3 py-2 text-[0.65rem] text-muted-foreground">
														{formatDate(message.createdAt)}
														{message.resolved
															? ` · Resolved by ${message.resolvedBy ?? "—"} on ${formatDate(message.resolvedAt)}`
															: " · Awaiting resolution"}
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>
					</main>

					<aside className="space-y-4">
						<Card className="border-border/70">
							<CardHeader className="pb-3">
								<CardTitle className="text-sm">Mission</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm text-muted-foreground">
								<p className="font-medium text-foreground">{mission.name}</p>
								<p>{mission.description}</p>
								<Badge
									variant="outline"
									className="rounded-full border-border/70 bg-muted/60 px-2 py-0.5 text-[0.65rem] font-medium text-foreground/80"
								>
									{mission.status}
								</Badge>
							</CardContent>
						</Card>

						<Card className="border-border/70">
							<CardHeader className="pb-3">
								<CardTitle className="text-sm">Assignee</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
								<span className="text-[0.65rem] text-muted-foreground">
									Assigned
								</span>
								<span
									className={cn(
										"inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-0.5 text-[0.65rem] font-medium text-foreground",
										assigneeLabel === "Unassigned" &&
											"border-dashed text-muted-foreground",
									)}
								>
									{assigneeLabel}
								</span>
							</CardContent>
						</Card>

						<Card className="border-border/70">
							<CardHeader className="pb-3">
								<CardTitle className="text-sm">Participants</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-wrap gap-2">
								{participants.size === 0 ? (
									<div className="text-xs text-muted-foreground">
										No participants yet.
									</div>
								) : (
									Array.from(participants).map((id) => (
										<Badge
											key={id}
											variant="outline"
											className="rounded-full border-border/70 bg-background px-2 py-0.5 text-[0.6rem] font-medium text-foreground/80"
										>
											{workerMap.get(id) ?? id}
										</Badge>
									))
								)}
							</CardContent>
						</Card>
					</aside>
				</div>
			</div>
		</div>
	);
}
