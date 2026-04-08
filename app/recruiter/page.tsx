"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiRequest } from "../lib/api";

type Stats = {
  total_assessments: number;
  published_assessments: number;
  total_invitations: number;
  completed_sessions: number;
  completion_rate: number;
  average_score: number;
  pass_rate: number;
  pending_review: number;
};

type Result = {
  id: number;
  percentage: number;
  passed: boolean;
  pending_manual_review: boolean;
  status: string;
  candidate_session: { status: string; submitted_at: string | null };
  invitation: { candidate_name: string; candidate_email: string };
  assessment: { id: number; title: string };
  result_details: unknown[];
};

type ResultsResponse = {
  results: Result[];
  meta: { total_count: number };
  facets: {
    pass_fail?: Array<{ key: string; count: number }>;
    completion_status?: Array<{ key: string; count: number }>;
  };
};

function pct(n: number | string | null | undefined) {
  return `${Number(n ?? 0).toFixed(1)}%`;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [assessmentList, setAssessmentList] = useState<Array<{ id: number; title: string }>>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [facets, setFacets] = useState<ResultsResponse["facets"]>({});
  const [totalResults, setTotalResults] = useState(0);
  const [q, setQ] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [passFail, setPassFail] = useState("");
  const [completionStatus, setCompletionStatus] = useState("");
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const params = new URLSearchParams({ per_page: "20" });
      if (q) params.set("q", q);
      if (assessmentId) params.set("assessment_id", assessmentId);
      if (passFail) params.set("pass_fail", passFail);
      if (completionStatus) params.set("completion_status", completionStatus);

      const [s, r] = await Promise.all([
        apiRequest<Stats>("/dashboard/stats", {}, token),
        apiRequest<ResultsResponse>(`/dashboard/results?${params}`, {}, token)
      ]);
      setStats(s);
      setResults(r.results);
      setFacets(r.facets ?? {});
      setTotalResults(r.meta?.total_count ?? r.results.length);
      if (!selectedResult && r.results.length > 0) setSelectedResult(r.results[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }, [token, q, assessmentId, passFail, completionStatus, selectedResult]);

  useEffect(() => {
    if (!token) return;
    void load();
    // Load assessment list for filter dropdown
    apiRequest<{ assessments: Array<{ id: number; title: string }> }>(
      "/assessments?per_page=100",
      {},
      token
    ).then((d) => setAssessmentList(d.assessments)).catch(() => null);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReviewSave(detailId: number, scoreAwarded: number, reviewerNotes: string) {
    if (!selectedResult || !token) return;
    try {
      const updated = await apiRequest<Result>(
        `/dashboard/results/${selectedResult.id}/manual_review`,
        {
          method: "PATCH",
          body: JSON.stringify({ detail_id: detailId, score_awarded: scoreAwarded, reviewer_notes: reviewerNotes })
        },
        token
      );
      setSelectedResult(updated);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review save failed");
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="lede">Overview of assessments, invitations, and candidate results.</p>
        </div>
        <Link className="button button--primary" href="/recruiter/assessments/new">
          New Assessment
        </Link>
      </div>

      {error && <p className="notice notice--error">{error}</p>}

      <div className="stats-grid">
        {[
          ["Assessments", stats?.total_assessments ?? "—"],
          ["Published", stats?.published_assessments ?? "—"],
          ["Invitations", stats?.total_invitations ?? "—"],
          ["Completed", stats?.completed_sessions ?? "—"],
          ["Completion Rate", stats ? pct(stats.completion_rate) : "—"],
          ["Avg Score", stats ? pct(stats.average_score) : "—"],
          ["Pass Rate", stats ? pct(stats.pass_rate) : "—"],
          ["Pending Review", stats?.pending_review ?? "—"]
        ].map(([label, value]) => (
          <article className="stat-card" key={String(label)}>
            <span className="stat-label">{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Candidate Results</h2>
          <div className="facet-row">
            {(facets.pass_fail ?? []).map((f) => (
              <span className="pill" key={f.key}>{f.key}: {f.count}</span>
            ))}
            {(facets.completion_status ?? []).map((f) => (
              <span className="pill" key={f.key}>{f.key}: {f.count}</span>
            ))}
            <span className="pill pill--muted">Total: {totalResults}</span>
          </div>
        </div>

        <div className="filters">
          <input
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            value={q}
          />
          <select onChange={(e) => setAssessmentId(e.target.value)} value={assessmentId}>
            <option value="">All assessments</option>
            {assessmentList.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
          <select onChange={(e) => setPassFail(e.target.value)} value={passFail}>
            <option value="">All outcomes</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
          <select onChange={(e) => setCompletionStatus(e.target.value)} value={completionStatus}>
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="auto_submitted">Auto-submitted</option>
            <option value="expired">Expired</option>
          </select>
          <button className="button button--primary" onClick={() => void load()} type="button">
            Search
          </button>
        </div>

        <div className="results-layout">
          <div className="results-list">
            {results.length === 0 && <p className="empty-state">No results yet.</p>}
            {results.map((r) => (
              <button
                className={`result-card${selectedResult?.id === r.id ? " result-card--active" : ""}`}
                key={r.id}
                onClick={() => setSelectedResult(r)}
                type="button"
              >
                <strong>{r.invitation.candidate_name || r.invitation.candidate_email}</strong>
                <span>{r.assessment.title}</span>
                <span>{pct(r.percentage)} · {r.passed ? "pass" : "fail"}</span>
                <span className="status-badge">{r.candidate_session.status}</span>
              </button>
            ))}
          </div>

          <div className="result-detail">
            {selectedResult ? (
              <ResultDrilldown result={selectedResult} onReviewSave={handleReviewSave} />
            ) : (
              <p className="empty-state">Select a result to inspect answers and manual review items.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

type DetailRecord = {
  id: number;
  candidate_answer: string | null;
  expected_answer: string | null;
  score_awarded: number;
  max_score: number;
  review_status: string;
  reviewer_notes: string | null;
  question: { id: number; body: string; question_type: string; points: number };
};

function ResultDrilldown({
  result,
  onReviewSave
}: {
  result: Result;
  onReviewSave: (detailId: number, score: number, notes: string) => Promise<void>;
}) {
  const details = result.result_details as DetailRecord[];
  return (
    <>
      <div className="detail-header">
        <h3>{result.invitation.candidate_name || result.invitation.candidate_email}</h3>
        <p className="muted">{result.invitation.candidate_email}</p>
        <p>
          {result.assessment.title} ·{" "}
          <strong>{Number(result.percentage ?? 0).toFixed(1)}%</strong> ·{" "}
          <span className={result.passed ? "badge badge--pass" : "badge badge--fail"}>
            {result.passed ? "PASS" : "FAIL"}
          </span>
        </p>
        {result.pending_manual_review && (
          <p className="notice notice--warning">Manual review pending</p>
        )}
      </div>
      <div className="detail-stack">
        {details.map((d) => (
          <ReviewCard detail={d} key={d.id} onSave={onReviewSave} />
        ))}
      </div>
    </>
  );
}

function ReviewCard({
  detail,
  onSave
}: {
  detail: DetailRecord;
  onSave: (id: number, score: number, notes: string) => Promise<void>;
}) {
  const [score, setScore] = useState(detail.score_awarded);
  const [notes, setNotes] = useState(detail.reviewer_notes ?? "");
  const [saving, setSaving] = useState(false);

  const isPending = detail.review_status === "pending_manual_review";

  return (
    <article className="review-card">
      <div className="review-head">
        <strong>{detail.question.body}</strong>
        <span className={isPending ? "badge badge--warn" : "badge badge--neutral"}>
          {detail.review_status.replace(/_/g, " ")}
        </span>
      </div>
      <p><span className="muted">Answer:</span> {detail.candidate_answer || <em>No answer</em>}</p>
      {detail.expected_answer && (
        <p><span className="muted">Expected:</span> {detail.expected_answer}</p>
      )}
      <div className="score-line">
        <span className="muted">Score:</span>
        {isPending ? (
          <input
            max={detail.max_score}
            min={0}
            onChange={(e) => setScore(Number(e.target.value))}
            style={{ width: 64 }}
            type="number"
            value={score}
          />
        ) : (
          <strong>{detail.score_awarded}</strong>
        )}
        <span className="muted">/ {detail.max_score}</span>
      </div>
      {isPending && (
        <>
          <label className="field">
            Reviewer notes
            <textarea onChange={(e) => setNotes(e.target.value)} rows={2} value={notes} />
          </label>
          <button
            className="button button--primary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave(detail.id, score, notes);
              setSaving(false);
            }}
            type="button"
          >
            {saving ? "Saving…" : "Save Review"}
          </button>
        </>
      )}
    </article>
  );
}
