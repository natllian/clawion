import { join } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { readJson } from "@/core/fs/json";
import { missionSchema, tasksSchema, workersSchema } from "@/core/schemas";
import { resolveMissionPath } from "@/core/workspace/mission";
import { resolveMissionsDir } from "@/core/workspace/paths";
import { getThread } from "@/core/workspace/threads";

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
	const isBlocked = task.statusNotes.toLowerCase().startsWith("blocked:");
	const workerMap = new Map(
		workersFile.workers.map((worker) => [worker.id, worker.displayName]),
	);

	const participants = new Set<string>();
	thread.messages.forEach((message) => {
		participants.add(message.authorId);
		participants.add(message.mentions);
	});

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
				<nav className="text-xs text-muted-foreground">
					<Link href="/" className="hover:text-foreground">
						Missions
					</Link>
					<span className="mx-2">/</span>
					<span className="font-medium text-foreground">{mission.name}</span>
				</nav>

				<section className="flex flex-col gap-4">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<h1 className="text-2xl font-semibold text-foreground">
								{task.title}
								<span className="ml-2 text-sm text-muted-foreground">
									#{task.id}
								</span>
							</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								{task.description}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge
								variant="outline"
								className="rounded-full text-[0.6rem] uppercase tracking-[0.3em]"
							>
								{column?.name ?? task.columnId}
							</Badge>
							<Badge
								variant={isBlocked ? "destructive" : "outline"}
								className="rounded-full text-[0.6rem] uppercase tracking-[0.3em]"
							>
								{isBlocked ? "Blocked" : "Active"}
							</Badge>
						</div>
					</div>

					<div className="rounded-xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
						<div className="flex flex-wrap items-center gap-3">
							<span>Created {formatDate(task.createdAt)}</span>
							<span>Updated {formatDate(task.updatedAt)}</span>
							<span>Assignee: {task.assigneeId ?? "Unassigned"}</span>
						</div>
						{task.statusNotes ? (
							<p className="mt-2 text-sm text-muted-foreground">
								{task.statusNotes}
							</p>
						) : null}
					</div>
				</section>

				<div className="grid gap-6 lg:grid-cols-[1.6fr_0.6fr]">
					<main className="flex flex-col gap-4">
						<Card className="border-border/70">
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Thread</CardTitle>
								<CardDescription className="text-xs">
									One message per recipient. Mentions are required.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								{thread.messages.length === 0 ? (
									<div className="rounded-lg border border-border/70 bg-background p-4 text-sm text-muted-foreground">
										No thread messages yet.
									</div>
								) : (
									thread.messages.map((message) => (
										<div
											key={message.id}
											className="rounded-lg border border-border/70 bg-background p-4"
										>
											<div className="flex flex-wrap items-center justify-between gap-3">
												<div className="text-xs text-muted-foreground">
													<span className="font-medium text-foreground">
														{workerMap.get(message.authorId) ??
															message.authorId}
													</span>
													<span className="ml-2 rounded-full border border-border/70 px-2 py-0.5">
														@
														{workerMap.get(message.mentions) ??
															message.mentions}
													</span>
												</div>
												<Badge
													variant="outline"
													className="rounded-full text-[0.6rem] uppercase tracking-[0.3em]"
												>
													{message.resolved ? "Resolved" : "Open"}
												</Badge>
											</div>
											<p className="mt-3 text-sm text-foreground">
												{message.content}
											</p>
											<Separator className="my-3" />
											<div className="text-xs text-muted-foreground">
												{formatDate(message.createdAt)}
												{message.resolved
													? ` · Resolved by ${message.resolvedBy ?? "—"} on ${formatDate(message.resolvedAt)}`
													: " · Awaiting resolution"}
											</div>
										</div>
									))
								)}
							</CardContent>
						</Card>
					</main>

					<aside className="flex flex-col gap-4">
						<Card className="border-border/70">
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Mission</CardTitle>
								<CardDescription className="text-xs">
									{mission.id}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2 text-sm text-muted-foreground">
								<p className="font-medium text-foreground">{mission.name}</p>
								<p>{mission.description}</p>
								<Badge
									variant="outline"
									className="rounded-full text-[0.6rem] uppercase tracking-[0.3em]"
								>
									{mission.status}
								</Badge>
							</CardContent>
						</Card>

						<Card className="border-border/70">
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Participants</CardTitle>
								<CardDescription className="text-xs">
									Unique authors and mentions
								</CardDescription>
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
											className="rounded-full text-[0.6rem] uppercase tracking-[0.3em]"
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
