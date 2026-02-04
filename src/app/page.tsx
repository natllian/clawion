import { redirect } from "next/navigation";
import { loadMissionsIndex } from "@/core/workspace/index-file";
import { resolveMissionsDir } from "@/core/workspace/paths";

export default async function Home() {
	const missionsDir = resolveMissionsDir();
	const missionsIndex = await loadMissionsIndex(missionsDir);

	if (missionsIndex.missions.length > 0) {
		redirect(`/missions/${missionsIndex.missions[0].id}`);
	}

	// If no missions, render a simple message (Dashboard won't work without missions)
	return (
		<div className="flex min-h-screen items-center justify-center bg-background text-foreground">
			<div className="text-center">
				<h1 className="text-2xl font-semibold">No missions found</h1>
				<p className="mt-2 text-muted-foreground">
					Run `clawion init` to initialize your workspace.
				</p>
			</div>
		</div>
	);
}
