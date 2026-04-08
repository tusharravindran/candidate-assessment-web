import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="shell shell--hero">
        <div className="hero-copy">
          <span className="eyebrow">Candidate Assessment Platform</span>
          <h1>Recruit smarter with timed, tenant-isolated assessments.</h1>
          <p className="lede">
            Create assessments, invite candidates via secure single-use links, auto-score
            objective answers, and review free-text responses — all within your private
            organization workspace.
          </p>
          <div className="actions">
            <Link className="button button--primary" href="/recruiter">
              Recruiter Dashboard
            </Link>
            <Link className="button button--ghost" href="/recruiter/signup">
              Create Account
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="stack">
            <div className="stat-card">
              <span className="stat-label">Recruiter Flow</span>
              <strong>Create → Publish → Invite → Review</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Candidate Flow</span>
              <strong>Token link → Timed session → Submit</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Backend</span>
              <strong>Rails API · Sidekiq · Elasticsearch</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Tenant Isolation</span>
              <strong>Row-level scoping + Pundit policies</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
