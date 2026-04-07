"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useTransition } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const TOKEN_KEY = "candidate-assessment-token";

type DashboardStats = {
  total_assessments: number;
  total_invitations: number;
  completed_sessions: number;
  completion_rate: number;
  average_score: number;
  pass_rate: number;
  pending_review: number;
};

type Assessment = {
  id: number;
  title: string;
  status: string;
  total_invited: number;
  total_completed: number;
  completion_rate: number;
  average_score: number;
  pass_rate: number;
};

type ResultDetail = {
  id: number;
  candidate_answer: string | null;
  expected_answer: string | null;
  score_awarded: number;
  max_score: number;
  review_status: string;
  reviewer_notes: string | null;
  question: {
    id: number;
    body: string;
    question_type: string;
  };
};

type ResultRecord = {
  id: number;
  percentage: number;
  total_score: number;
  max_score: number;
  pass_fail: string;
  pending_manual_review: boolean;
  candidate_session: {
    id: number;
    status: string;
    submitted_at: string | null;
  };
  invitation: {
    candidate_name: string;
    candidate_email: string;
  };
  assessment: {
    id: number;
    title: string;
  };
  result_details: ResultDetail[];
};

type ResultsResponse = {
  results: ResultRecord[];
  facets?: {
    pass_fail?: Array<{ key: string; count: number }>;
    assessments?: Array<{ key: string; count: number }>;
    completion_status?: Array<{ key: string; count: number }>;
  };
};

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

async function readJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export function RecruiterConsole() {
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("password123");
  const [organizationName, setOrganizationName] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [selectedResult, setSelectedResult] = useState<ResultRecord | null>(null);
  const [filters, setFilters] = useState({
    q: "",
    assessmentId: "",
    passFail: "",
    completionStatus: ""
  });
  const [facets, setFacets] = useState<ResultsResponse["facets"]>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const existingToken = window.localStorage.getItem(TOKEN_KEY) || "";
    if (!existingToken) {
      return;
    }

    setToken(existingToken);
    setSavedToken(existingToken);
  }, []);

  useEffect(() => {
    if (!savedToken) {
      return;
    }

    startTransition(() => {
      void refreshDashboard(savedToken);
    });
  }, [savedToken]);

  async function request(path: string, init?: RequestInit, authToken = savedToken) {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: authToken } : {}),
        ...(init?.headers || {})
      }
    });

    if (!response.ok) {
      const payload = await readJson(response);
      throw new Error(payload.message || payload.error || "Request failed");
    }

    return response;
  }

  async function refreshDashboard(authToken = savedToken) {
    try {
      setError("");
      const [orgResponse, statsResponse, assessmentsResponse, resultsResponse] =
        await Promise.all([
          request("/organization", undefined, authToken),
          request("/dashboard/stats", undefined, authToken),
          request("/assessments?per_page=20", undefined, authToken),
          request(buildResultsPath(), undefined, authToken)
        ]);

      const organization = await readJson(orgResponse);
      const statsPayload = await readJson(statsResponse);
      const assessmentsPayload = await readJson(assessmentsResponse);
      const resultsPayload = (await readJson(resultsResponse)) as ResultsResponse;

      setOrganizationName(organization.name || "");
      setStats(statsPayload);
      setAssessments(assessmentsPayload.assessments || []);
      setResults(resultsPayload.results || []);
      setSelectedResult(resultsPayload.results?.[0] || null);
      setFacets(resultsPayload.facets || {});
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard");
    }
  }

  function buildResultsPath() {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.assessmentId) params.set("assessment_id", filters.assessmentId);
    if (filters.passFail) params.set("pass_fail", filters.passFail);
    if (filters.completionStatus) params.set("completion_status", filters.completionStatus);
    params.set("per_page", "20");
    return `/dashboard/results?${params.toString()}`;
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/sign_in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiter: {
            email,
            password
          }
        })
      });

      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Login failed");
      }

      const authHeader =
        response.headers.get("Authorization") || response.headers.get("authorization") || "";

      if (!authHeader) {
        throw new Error("JWT token missing from the sign-in response");
      }

      window.localStorage.setItem(TOKEN_KEY, authHeader);
      setToken(authHeader);
      setSavedToken(authHeader);
      setMessage(payload.message || "Logged in successfully");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Login failed");
    }
  }

  async function handleLogout() {
    if (savedToken) {
      try {
        await request("/auth/sign_out", { method: "DELETE" });
      } catch {
        // Ignore logout failures and clear local state anyway.
      }
    }

    window.localStorage.removeItem(TOKEN_KEY);
    setSavedToken("");
    setToken("");
    setStats(null);
    setAssessments([]);
    setResults([]);
    setSelectedResult(null);
    setOrganizationName("");
    setMessage("Logged out");
    setError("");
  }

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await refreshDashboard();
  }

  async function handleManualReview(detailId: number, scoreAwarded: number, reviewerNotes: string) {
    if (!selectedResult) {
      return;
    }

    try {
      setError("");
      const response = await request(`/dashboard/results/${selectedResult.id}/manual_review`, {
        method: "PATCH",
        body: JSON.stringify({
          detail_id: detailId,
          score_awarded: scoreAwarded,
          reviewer_notes: reviewerNotes
        })
      });

      const payload = (await readJson(response)) as ResultRecord;
      setSelectedResult(payload);
      await refreshDashboard();
      setMessage("Manual review saved");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Manual review failed");
    }
  }

  return (
    <main className="page">
      <section className="shell">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Recruiter Workspace</span>
            <h1>{organizationName || "Tenant-scoped recruiter dashboard"}</h1>
            <p className="lede">
              Sign in with a recruiter account to inspect tenant-bound assessments, Elasticsearch
              search results, and pending manual reviews.
            </p>
          </div>

          <Link className="button button--ghost" href="/">
            Back Home
          </Link>
        </div>

        <form className="auth-form" onSubmit={handleSignIn}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="button button--primary" type="submit">
            Sign In
          </button>
          {savedToken ? (
            <button className="button button--ghost" onClick={handleLogout} type="button">
              Sign Out
            </button>
          ) : null}
        </form>

        {message ? <p className="notice notice--success">{message}</p> : null}
        {error ? <p className="notice notice--error">{error}</p> : null}

        <div className="token-panel">
          <label>
            Active JWT
            <textarea readOnly rows={3} value={token} />
          </label>
        </div>

        <div className="stats-grid">
          {[
            ["Assessments", stats?.total_assessments ?? 0],
            ["Invitations", stats?.total_invitations ?? 0],
            ["Completed", stats?.completed_sessions ?? 0],
            ["Completion Rate", formatPercent(stats?.completion_rate ?? 0)],
            ["Average Score", formatPercent(stats?.average_score ?? 0)],
            ["Pass Rate", formatPercent(stats?.pass_rate ?? 0)],
            ["Pending Review", stats?.pending_review ?? 0]
          ].map(([label, value]) => (
            <article className="stat-card" key={label}>
              <span className="stat-label">{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>

        <div className="content-grid">
          <section className="panel">
            <div className="section-heading section-heading--compact">
              <div>
                <h2>Assessments</h2>
                <p>Tenant-scoped lifecycle and performance metrics.</p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Status</th>
                    <th>Invited</th>
                    <th>Completed</th>
                    <th>Average</th>
                    <th>Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((assessment) => (
                    <tr key={assessment.id}>
                      <td>{assessment.title}</td>
                      <td>{assessment.status}</td>
                      <td>{assessment.total_invited}</td>
                      <td>{assessment.total_completed}</td>
                      <td>{formatPercent(assessment.average_score)}</td>
                      <td>{formatPercent(assessment.pass_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="section-heading section-heading--compact">
              <div>
                <h2>Candidate Results</h2>
                <p>Elasticsearch-backed search, filters, and drill-down review.</p>
              </div>
            </div>

            <form className="filters" onSubmit={handleSearchSubmit}>
              <input
                placeholder="Search candidate name or email"
                value={filters.q}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, q: event.target.value }))
                }
              />
              <select
                value={filters.assessmentId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, assessmentId: event.target.value }))
                }
              >
                <option value="">All assessments</option>
                {assessments.map((assessment) => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.title}
                  </option>
                ))}
              </select>
              <select
                value={filters.passFail}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, passFail: event.target.value }))
                }
              >
                <option value="">All outcomes</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </select>
              <select
                value={filters.completionStatus}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    completionStatus: event.target.value
                  }))
                }
              >
                <option value="">All statuses</option>
                <option value="submitted">submitted</option>
                <option value="auto_submitted">auto_submitted</option>
                <option value="expired">expired</option>
              </select>
              <button className="button button--primary" disabled={isPending} type="submit">
                Refresh
              </button>
            </form>

            <div className="facet-row">
              {(facets?.pass_fail || []).map((facet) => (
                <span className="pill" key={facet.key}>
                  {facet.key}: {facet.count}
                </span>
              ))}
              {(facets?.completion_status || []).map((facet) => (
                <span className="pill" key={facet.key}>
                  {facet.key}: {facet.count}
                </span>
              ))}
            </div>

            <div className="results-layout">
              <div className="results-list">
                {results.map((result) => (
                  <button
                    className={`result-card${selectedResult?.id === result.id ? " result-card--active" : ""}`}
                    key={result.id}
                    onClick={() => setSelectedResult(result)}
                    type="button"
                  >
                    <strong>{result.invitation.candidate_name || result.invitation.candidate_email}</strong>
                    <span>{result.assessment.title}</span>
                    <span>
                      {formatPercent(result.percentage)} · {result.pass_fail}
                    </span>
                    <span>{result.candidate_session.status}</span>
                  </button>
                ))}
              </div>

              <div className="result-detail">
                {selectedResult ? (
                  <>
                    <div className="detail-header">
                      <h3>{selectedResult.invitation.candidate_name || "Candidate result"}</h3>
                      <p>{selectedResult.invitation.candidate_email}</p>
                      <p>
                        {selectedResult.assessment.title} · {formatPercent(selectedResult.percentage)} ·{" "}
                        {selectedResult.pass_fail}
                      </p>
                    </div>

                    <div className="detail-stack">
                      {selectedResult.result_details.map((detail) => (
                        <ReviewCard
                          detail={detail}
                          key={detail.id}
                          onSave={handleManualReview}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="empty-state">Select a result to inspect answers and manual review items.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function ReviewCard({
  detail,
  onSave
}: {
  detail: ResultDetail;
  onSave: (detailId: number, scoreAwarded: number, reviewerNotes: string) => Promise<void>;
}) {
  const [scoreAwarded, setScoreAwarded] = useState(detail.score_awarded);
  const [reviewerNotes, setReviewerNotes] = useState(detail.reviewer_notes || "");

  return (
    <article className="review-card">
      <div className="review-head">
        <strong>{detail.question.body}</strong>
        <span>{detail.review_status}</span>
      </div>
      <p>
        <strong>Candidate answer:</strong> {detail.candidate_answer || "No answer provided"}
      </p>
      {detail.expected_answer ? (
        <p>
          <strong>Expected:</strong> {detail.expected_answer}
        </p>
      ) : null}
      <div className="review-controls">
        <label>
          Score
          <input
            max={detail.max_score}
            min={0}
            onChange={(event) => setScoreAwarded(Number(event.target.value))}
            type="number"
            value={scoreAwarded}
          />
        </label>
        <label className="review-notes">
          Notes
          <textarea
            onChange={(event) => setReviewerNotes(event.target.value)}
            rows={3}
            value={reviewerNotes}
          />
        </label>
        {detail.review_status === "pending_manual_review" ? (
          <button
            className="button button--primary"
            onClick={() => void onSave(detail.id, scoreAwarded, reviewerNotes)}
            type="button"
          >
            Save Review
          </button>
        ) : null}
      </div>
    </article>
  );
}
