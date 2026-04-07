import Link from "next/link";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export default function HomePage() {
  return (
    <main className="page">
      <section className="shell shell--hero">
        <div className="hero-copy">
          <span className="eyebrow">Candidate Assessment Platform</span>
          <h1>Separate recruiter and candidate flows, one deployable full-stack build.</h1>
          <p className="lede">
            The frontend is wired to the Rails API through
            <code> NEXT_PUBLIC_API_URL</code>. Use the recruiter workspace to inspect
            tenant-scoped dashboards and the candidate route for invitation-driven test
            sessions.
          </p>
          <div className="actions">
            <Link className="button button--primary" href="/recruiter">
              Open Recruiter Workspace
            </Link>
            <Link className="button button--ghost" href="/candidate/demo-token">
              Preview Candidate Flow
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="stack">
            <div className="stat-card">
              <span className="stat-label">API Endpoint</span>
              <strong>{apiUrl}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Render Shape</span>
              <strong>Rails API + Sidekiq worker + Next.js web</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Local Infra</span>
              <strong>Docker Compose with Postgres, Redis, Elasticsearch</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
