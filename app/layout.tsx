import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Final Whistle · Office Pool",
  description: "A private office pool for the 2026 World Cup Final.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
