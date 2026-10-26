import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "King Kitty — Race the Alley",
  description: "Race your friends through a pixel-art alley. Jump, grab little boosts, and be first to the crown.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
