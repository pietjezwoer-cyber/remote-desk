import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Remote Desk", description: "Remote device management dashboard" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
