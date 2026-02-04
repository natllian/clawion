import { redirect } from "next/navigation";

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

	// Redirect to the new route with sidebar
	redirect(`/missions/${missionId}/threads/${taskId}`);
}
