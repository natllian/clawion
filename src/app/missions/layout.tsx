"use client";

import { useParams } from "next/navigation";
import { Dashboard } from "@/components/dashboard-ui/Dashboard";

function getParam(value: string | string[] | undefined): string | undefined {
	if (!value) {
		return undefined;
	}

	return Array.isArray(value) ? value[0] : value;
}

export default function MissionsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const params = useParams();
	const missionId = getParam(
		params?.missionId as string | string[] | undefined,
	);
	const threadId = getParam(params?.threadId as string | string[] | undefined);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<Dashboard missionId={missionId} threadId={threadId} />
			{children}
		</div>
	);
}
