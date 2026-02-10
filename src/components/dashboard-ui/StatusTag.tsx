"use client";

import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
	type StatusTone,
	statusTagBaseClass,
	statusToneClass,
} from "@/lib/status-tones";
import { cn } from "@/lib/utils";

interface StatusTagProps {
	tone: StatusTone;
	children: React.ReactNode;
	className?: string;
}

export function StatusTag({ tone, children, className }: StatusTagProps) {
	return (
		<Badge
			variant="outline"
			className={cn(statusTagBaseClass, statusToneClass[tone], className)}
		>
			{children}
		</Badge>
	);
}
