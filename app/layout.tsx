import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "./lib/auth";

export const metadata: Metadata = {
  title: "HireReady",
  description: "Recruiter-driven candidate assessments"
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
