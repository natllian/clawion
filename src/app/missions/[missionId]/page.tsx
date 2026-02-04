import { Dashboard } from "@/components/dashboard";

interface PageProps {
	params: Promise<{ missionId: string }> | { missionId: string };
}

export default async function MissionPage({ params }: PageProps) {
	const { missionId } = await params;

	return <Dashboard missionId={missionId} />;
}
