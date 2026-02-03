import { NextResponse } from "next/server";

const overview = {
	updatedAt: "2026-02-03T02:10:00Z",
	summary: [
		{
			label: "Active streams",
			value: "214",
			delta: "+18",
			trend: "up",
			note: "Realtime inference lanes",
		},
		{
			label: "Signals flagged",
			value: "62",
			delta: "-4",
			trend: "down",
			note: "Filtered by threat models",
		},
		{
			label: "Noise floor",
			value: "0.14%",
			delta: "+0.02%",
			trend: "up",
			note: "Normalized drift variance",
		},
		{
			label: "Causal links",
			value: "1,482",
			delta: "+130",
			trend: "up",
			note: "Edges resolved this hour",
		},
	],
	signals: [
		{
			id: "signal-1",
			name: "Orbital latency drift",
			owner: "Atlas",
			score: 78,
			change: "+12%",
			status: "watch",
		},
		{
			id: "signal-2",
			name: "Merchant pulse inversion",
			owner: "Lumen",
			score: 64,
			change: "+4%",
			status: "stabilizing",
		},
		{
			id: "signal-3",
			name: "Cold start ripple",
			owner: "Halo",
			score: 49,
			change: "-3%",
			status: "cooling",
		},
	],
	activity: [
		{
			id: "event-1",
			title: "Atlas reconciled 6 drift clusters",
			tag: "graph",
			actor: "Atlas",
			time: "2m ago",
		},
		{
			id: "event-2",
			title: "Lumen validated new anomaly cohort",
			tag: "review",
			actor: "Lumen",
			time: "11m ago",
		},
		{
			id: "event-3",
			title: "Halo rebalanced 14 stream weights",
			tag: "tuning",
			actor: "Halo",
			time: "27m ago",
		},
	],
	agents: [
		{
			id: "agent-1",
			name: "Nova",
			role: "Boundary Sentinel",
			focus: "North Atlantic",
			status: "online",
		},
		{
			id: "agent-2",
			name: "Kite",
			role: "Signal Sculptor",
			focus: "APAC Mesh",
			status: "online",
		},
		{
			id: "agent-3",
			name: "Drift",
			role: "Patch Weaver",
			focus: "Synthetic feed",
			status: "idle",
		},
	],
};

export function GET() {
	return NextResponse.json(overview, {
		headers: {
			"Cache-Control": "no-store",
		},
	});
}
