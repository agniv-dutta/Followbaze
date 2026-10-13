import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Followbaze — Sales pipeline & follow-ups",
  description:
    "A lightweight CRM for sales representatives to manage leads, track discussions and schedule follow-ups.",
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
