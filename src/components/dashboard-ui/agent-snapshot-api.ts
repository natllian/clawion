import type { WorkingEvent } from "@/core/schemas";

type WorkingResponse = {
	events: WorkingEvent[];
};

type SecretResponse = {
	content: string;
};

type AgentSnapshotPayload = {
	working: WorkingEvent[];
	secret: string;
};

function encodePathSegment(value: string): string {
	return encodeURIComponent(value);
}

export async function fetchAgentSnapshotPayload(
	missionId: string,
	agentId: string,
	signal?: AbortSignal,
): Promise<AgentSnapshotPayload | null> {
	const encodedMissionId = encodePathSegment(missionId);
	const encodedAgentId = encodePathSegment(agentId);

	const [workingResponse, secretResponse] = await Promise.all([
		fetch(`/api/missions/${encodedMissionId}/working/${encodedAgentId}`, {
			cache: "no-store",
			signal,
		}),
		fetch(`/api/missions/${encodedMissionId}/secrets/${encodedAgentId}`, {
			cache: "no-store",
			signal,
		}),
	]);

	if (!workingResponse.ok || !secretResponse.ok) {
		return null;
	}

	const workingPayload = (await workingResponse.json()) as WorkingResponse;
	const secretPayload = (await secretResponse.json()) as SecretResponse;

	return {
		working: workingPayload.events,
		secret: secretPayload.content,
	};
}

export async function saveAgentSecret(
	missionId: string,
	agentId: string,
	content: string,
): Promise<void> {
	const encodedMissionId = encodePathSegment(missionId);
	const encodedAgentId = encodePathSegment(agentId);

	const response = await fetch(
		`/api/missions/${encodedMissionId}/secrets/${encodedAgentId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ content }),
		},
	);

	if (!response.ok) {
		throw new Error("Failed to save dark secret.");
	}
}

export async function saveAgentRoleDescription(
	missionId: string,
	agentId: string,
	roleDescription: string,
): Promise<void> {
	const encodedMissionId = encodePathSegment(missionId);
	const encodedAgentId = encodePathSegment(agentId);

	const response = await fetch(
		`/api/missions/${encodedMissionId}/agents/${encodedAgentId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ roleDescription }),
		},
	);

	if (!response.ok) {
		throw new Error("Failed to save role description.");
	}
}
