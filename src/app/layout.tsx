import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
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
	title: "Clawion Signal Observatory",
	description:
		"Read-only control plane for live signal intelligence with Magic UI inspired visuals.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="scroll-smooth">
			<body
				className={`${body.variable} ${display.variable} ${mono.variable} bg-background text-foreground antialiased`}
			>
				{children}
			</body>
		</html>
	);
}
