import { NextResponse } from "next/server";
import { NotFoundError } from "@/core/errors";

/**
 * Shared route context types for Next.js dynamic routes.
 */
export type MissionRouteContext = {
	params: Promise<{ missionId: string }> | { missionId: string };
};

export type MissionAgentRouteContext = {
	params:
		| Promise<{ missionId: string; agentId: string }>
		| { missionId: string; agentId: string };
};

export type MissionTaskRouteContext = {
	params:
		| Promise<{ missionId: string; taskId: string }>
		| { missionId: string; taskId: string };
};

/**
 * Standard error response with proper status code detection.
 */
export function errorResponse(error: unknown): NextResponse {
	const message = error instanceof Error ? error.message : "Unknown error";
	const status = error instanceof NotFoundError ? 404 : 500;
	return NextResponse.json({ error: message }, { status });
}

/**
 * Shared no-cache headers for GET responses.
 */
export const NO_CACHE_HEADERS = {
	"Cache-Control": "no-store",
} as const;

/**
 * Parse JSON body with proper 400 handling.
 * Returns null + response if parsing fails.
 */
export async function parseJsonBody<T = unknown>(
	request: Request,
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
	try {
		const data = (await request.json()) as T;
		return { data };
	} catch {
		return {
			error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
		};
	}
}
