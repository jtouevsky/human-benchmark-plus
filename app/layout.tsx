import type { Metadata } from "next";
import "./globals.css";
import "./experience.css";
import "./measurement.css";
import "./worlds.css";
export const metadata: Metadata = {
  title: "Human Benchmark++ — An adaptive measurement experiment",
  description:
    "Explore your cognitive task profile through reaction, memory, numerical, and spatial experiments.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
