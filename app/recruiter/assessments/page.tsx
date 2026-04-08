"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { apiRequest } from "../../lib/api";

type Assessment = {
  id: number;
  title: string;
  description: string;
  status: string;
  time_limit_minutes: number;
  passing_score: number;
  total_invited: number;
  total_completed: number;
  completion_rate: number;
  average_score: number;
  pass_rate: number;
};

export default function AssessmentsPage() {
  const { token } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ assessments: Assessment[]; meta: { total_count: number } }>(
        "/assessments?per_page=50",
        {},
        token
      );
      setAssessments(data.assessments);
      setTotal(data.meta.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function lifecycle(id: number, action: "publish" | "archive") {
    if (!token) return;
    setActionMsg("");
    setError("");
    try {
      await apiRequest(`/assessments/${id}/${action}`, { method: "POST" }, token);
      setActionMsg(`Assessment ${action}d.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    }
  }

  async function deleteAssessment(id: number) {
    if (!token) return;
    if (!confirm("Delete this draft assessment?")) return;
    setError("");
    try {
      await apiRequest(`/assessments/${id}`, { method: "DELETE" }, token);
      setActionMsg("Assessment deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: "badge--neutral",
      published: "badge--pass",
      archived: "badge--warn"
    };
    return <span className={`badge ${map[s] ?? "badge--neutral"}`}>{s}</span>;
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Assessments</h1>
          <p className="lede">{total} total · manage assessment lifecycle and questions</p>
        </div>
        <Link className="button button--primary" href="/recruiter/assessments/new">
          New Assessment
        </Link>
      </div>

      {actionMsg && <p className="notice notice--success">{actionMsg}</p>}
      {error && <p className="notice notice--error">{error}</p>}

      {assessments.length === 0 ? (
        <div className="panel empty-panel">
          <p className="empty-state">No assessments yet.</p>
          <Link className="button button--primary" href="/recruiter/assessments/new">
            Create your first assessment
          </Link>
        </div>
      ) : (
        <div className="card-list">
          {assessments.map((a) => (
            <article className="assessment-card" key={a.id}>
              <div className="assessment-card-header">
                <div>
                  <h3>
                    <Link href={`/recruiter/assessments/${a.id}`}>{a.title}</Link>
                  </h3>
                  {statusBadge(a.status)}
                </div>
                <div className="assessment-card-actions">
                  <Link className="button button--ghost button--sm" href={`/recruiter/assessments/${a.id}`}>
                    Manage
                  </Link>
                  {a.status === "draft" && (
                    <>
                      <button
                        className="button button--primary button--sm"
                        onClick={() => void lifecycle(a.id, "publish")}
                        type="button"
                      >
                        Publish
                      </button>
                      <button
                        className="button button--danger button--sm"
                        onClick={() => void deleteAssessment(a.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {a.status === "published" && (
                    <button
                      className="button button--ghost button--sm"
                      onClick={() => void lifecycle(a.id, "archive")}
                      type="button"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>

              {a.description && <p className="muted">{a.description}</p>}

              <div className="assessment-meta-row">
                <span>{a.time_limit_minutes} min</span>
                <span>Pass ≥ {a.passing_score}%</span>
                <span>{a.total_invited} invited</span>
                <span>{a.total_completed} completed</span>
                <span>Avg {(a.average_score ?? 0).toFixed(1)}%</span>
                <span>Pass rate {(a.pass_rate ?? 0).toFixed(1)}%</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
