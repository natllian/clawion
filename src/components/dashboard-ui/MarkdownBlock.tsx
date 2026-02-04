"use client";

import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownBlockProps {
	content: string;
}

export function MarkdownBlock({ content }: MarkdownBlockProps) {
	const isLoading = content === "Loading ROADMAP.md...";

	if (isLoading) {
		return (
			<div
				className={cn(
					"flex items-center gap-2 text-sm text-muted-foreground",
					"animate-pulse",
				)}
			>
				<Loader2 className="h-4 w-4 animate-spin" />
				<span>Loading roadmap...</span>
			</div>
		);
	}

	return (
		<div className="markdown prose prose-sm dark:prose-invert max-w-none">
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
		</div>
	);
}
