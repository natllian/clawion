"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeMarkdownContent } from "@/lib/markdown";
import { cn } from "@/lib/utils";

interface MarkdownBlockProps {
	content: string;
	loading?: boolean;
}

export const MarkdownBlock = React.memo(function MarkdownBlock({
	content,
	loading = false,
}: MarkdownBlockProps) {
	const normalizedContent = normalizeMarkdownContent(content);

	if (loading) {
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
			<ReactMarkdown remarkPlugins={[remarkGfm]}>
				{normalizedContent}
			</ReactMarkdown>
		</div>
	);
});
