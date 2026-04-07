import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Candidate Assessment Web",
  description: "Frontend shell for the candidate assessment platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
