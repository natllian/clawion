"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownBlockProps {
	content: string;
}

export function MarkdownBlock({ content }: MarkdownBlockProps) {
	return (
		<div className="markdown">
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
		</div>
	);
}
