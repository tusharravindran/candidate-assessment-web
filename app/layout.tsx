import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "./lib/auth";

export const metadata: Metadata = {
  title: "Candidate Assessment Platform",
  description: "Recruiter-driven candidate assessment with tenant isolation and Elasticsearch search"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
