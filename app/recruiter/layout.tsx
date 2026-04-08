"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "../lib/auth";

export default function RecruiterLayout({ children }: { children: ReactNode }) {
  const { token, organizationName, isLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !token && pathname !== "/recruiter/login" && pathname !== "/recruiter/signup") {
      router.push("/recruiter/login");
    }
  }, [token, isLoading, pathname, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/recruiter/login");
  };

  const isAuthPage = pathname === "/recruiter/login" || pathname === "/recruiter/signup";

  if (isAuthPage) return <>{children}</>;

  if (isLoading || !token) {
    return (
      <main className="page">
        <section className="shell">
          <p className="empty-state">Loading...</p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <span className="eyebrow">Assessment Platform</span>
            {organizationName && <strong className="org-name">{organizationName}</strong>}
          </div>
          <ul className="nav-list">
            <li>
              <Link className="nav-link" href="/recruiter">
                Dashboard
              </Link>
            </li>
            <li>
              <Link className="nav-link" href="/recruiter/assessments">
                Assessments
              </Link>
            </li>
            <li>
              <Link className="nav-link" href="/recruiter/invitations">
                Invitations
              </Link>
            </li>
          </ul>
        </div>
        <button className="button button--ghost nav-signout" onClick={handleSignOut} type="button">
          Sign Out
        </button>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
}
