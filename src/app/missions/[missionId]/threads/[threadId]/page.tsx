import { Dashboard } from "@/components/dashboard";

interface PageProps {
	params:
		| Promise<{ missionId: string; threadId: string }>
		| { missionId: string; threadId: string };
}

export default async function ThreadPage({ params }: PageProps) {
	const { missionId, threadId } = await params;

	return <Dashboard missionId={missionId} threadId={threadId} />;
}
