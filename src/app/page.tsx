import { redirect } from "next/navigation";
import { loadMissionsIndex } from "@/core/workspace/index-file";
import { resolveMissionsDir } from "@/core/workspace/paths";

export const dynamic = "force-dynamic";

export default async function Home() {
	const missionsDir = resolveMissionsDir();
	const missionsIndex = await loadMissionsIndex(missionsDir).catch(() => ({
		missions: [],
	}));

	if (missionsIndex.missions.length > 0) {
		redirect(`/missions/${missionsIndex.missions[0].id}`);
	}

	// If no missions, render a simple message (Dashboard won't work without missions)
	return (
		<div className="flex min-h-screen items-center justify-center bg-background text-foreground">
			<div className="text-center">
				<h1 className="text-2xl font-semibold">No missions found</h1>
				<p className="mt-2 text-muted-foreground">
					Use the CLI to create a mission:{" "}
					<code>
						clawion mission create --id m1 --name &quot;My Mission&quot;
						--description &quot;...&quot;
					</code>
				</p>
			</div>
		</div>
	);
}
