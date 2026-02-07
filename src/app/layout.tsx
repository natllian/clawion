import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const display = Fraunces({
	variable: "--font-display",
	subsets: ["latin"],
	weight: ["400", "600", "700"],
});

const body = IBM_Plex_Sans({
	variable: "--font-body",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
	weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
	title: "Clawion Workspace",
	description: "Multi-agent mission management dashboard",
};

const THEME_INIT_SCRIPT = `(function(){var t=localStorage.getItem('clawion-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}})()`;

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="scroll-smooth" suppressHydrationWarning>
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: Static constant for FOIC prevention */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
			</head>
			<body
				className={`${body.variable} ${display.variable} ${mono.variable} bg-background text-foreground antialiased`}
			>
				<TooltipProvider>{children}</TooltipProvider>
			</body>
		</html>
	);
}
