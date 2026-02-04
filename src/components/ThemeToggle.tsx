"use client";

import { Moon, Sun } from "lucide-react";
import * as React from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "clawion-theme";
type ThemeChoice = "light" | "dark";

function applyTheme(theme: ThemeChoice) {
	if (typeof document === "undefined") {
		return;
	}

	document.documentElement.classList.toggle("dark", theme === "dark");
	document.documentElement.dataset.theme = theme;
}

export function ThemeToggle({ className }: { className?: string }) {
	const [theme, setTheme] = React.useState<ThemeChoice>("light");
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		const stored = window.localStorage.getItem(
			STORAGE_KEY,
		) as ThemeChoice | null;
		const prefersDark = window.matchMedia?.(
			"(prefers-color-scheme: dark)",
		).matches;
		const nextTheme = stored ?? (prefersDark ? "dark" : "light");

		applyTheme(nextTheme);
		setTheme(nextTheme);
		setMounted(true);
	}, []);

	React.useEffect(() => {
		if (!mounted) {
			return;
		}

		window.localStorage.setItem(STORAGE_KEY, theme);
		applyTheme(theme);
	}, [mounted, theme]);

	if (!mounted) {
		return (
			<div
				className={cn(
					"flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground",
					className,
				)}
			>
				<span className="h-3 w-8 rounded-full bg-muted/70" />
				<span>Theme</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur",
				className,
			)}
		>
			<Sun className="h-3.5 w-3.5" />
			<Switch
				checked={theme === "dark"}
				onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
				aria-label="Toggle color theme"
			/>
			<Moon className="h-3.5 w-3.5" />
		</div>
	);
}
