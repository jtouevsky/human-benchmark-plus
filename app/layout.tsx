import type { Metadata } from "next";
import "./globals.css";
import "./experience.css";
export const metadata: Metadata = {
  title: "Human Benchmark++ — Your mind, in more dimensions",
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
