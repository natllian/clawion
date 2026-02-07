"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-8">
			<div className="max-w-md space-y-4 text-center">
				<AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
				<h2 className="text-lg font-semibold text-foreground">
					Something went wrong
				</h2>
				<p className="text-sm text-muted-foreground">
					{error.message || "An unexpected error occurred."}
				</p>
				<button
					type="button"
					onClick={reset}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					Try again
				</button>
			</div>
		</div>
	);
}
