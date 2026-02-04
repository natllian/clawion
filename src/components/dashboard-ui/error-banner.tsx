"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorBannerProps {
	error: string | null;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
	if (!error) return null;

	return (
		<Card className="border-destructive/40 bg-destructive/10">
			<CardContent className="flex items-center gap-3 py-3 text-sm text-destructive">
				<AlertTriangle className="h-4 w-4" />
				{error}
			</CardContent>
		</Card>
	);
}
