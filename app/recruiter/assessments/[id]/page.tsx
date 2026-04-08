"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth";
import { apiRequest } from "../../../lib/api";

type Option = { id?: number; body: string; correct: boolean };

type Question = {
  id: number;
  body: string;
  question_type: string;
  points: number;
  position: number;
  question_options: Array<{ id: number; body: string; correct: boolean; position: number }>;
};

type Assessment = {
  id: number;
  title: string;
  description: string;
  status: string;
  time_limit_minutes: number;
  passing_score: number;
  questions: Question[];
};

type CandidateRow = {
  id: number;
  candidate_email: string;
  candidate_name: string | null;
  session_status: string;
  result_id: number | null;
  score_percentage: number | string | null;
  passed: boolean | null;
  used: boolean;
  expires_at: string;
  invitation_url: string;
  token: string;
};

type ResultDetail = {
  id: number;
  percentage: number;
  passed: boolean;
  pending_manual_review: boolean;
  result_details: Array<{
    id: number;
    candidate_answer: string | null;
    score_awarded: number;
    max_score: number;
    review_status: string;
    question: { body: string; question_type: string; points: number };
  }>;
};

const QUESTION_TYPES = ["multiple_choice", "true_false", "free_text"] as const;

function defaultOptions(type: string): Option[] {
  if (type === "true_false") return [
    { body: "True", correct: true },
    { body: "False", correct: false }
  ];
  if (type === "multiple_choice") return [
    { body: "", correct: true },
    { body: "", correct: false },
    { body: "", correct: false },
    { body: "", correct: false }
  ];
  return [];
}

const SESSION_STATUS_BADGE: Record<string, string> = {
  not_started: "badge--neutral",
  in_progress: "badge--warn",
  submitted: "badge--pass",
  auto_submitted: "badge--pass",
  expired: "badge--fail"
};

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [selectedResult, setSelectedResult] = useState<ResultDetail | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [activeTab, setActiveTab] = useState<"questions" | "candidates">("questions");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // edit mode state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTime, setEditTime] = useState(60);
  const [editPass, setEditPass] = useState(70);

  // new question state
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [qBody, setQBody] = useState("");
  const [qType, setQType] = useState<string>("multiple_choice");
  const [qPoints, setQPoints] = useState(1);
  const [qOptions, setQOptions] = useState<Option[]>(defaultOptions("multiple_choice"));
  const [savingQ, setSavingQ] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<Assessment>(`/assessments/${id}`, {}, token);
      setAssessment(data);
      setEditTitle(data.title);
      setEditDesc(data.description ?? "");
      setEditTime(data.time_limit_minutes);
      setEditPass(data.passing_score);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [id, token]);

  const loadCandidates = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ invitations: CandidateRow[] }>(
        `/invitations?assessment_id=${id}&per_page=100`,
        {},
        token
      );
      setCandidates(data.invitations);
    } catch {
      // non-fatal
    }
  }, [id, token]);

  useEffect(() => {
    void load();
    void loadCandidates();
  }, [load, loadCandidates]);

  async function openResult(resultId: number) {
    if (!token) return;
    setLoadingResult(true);
    setSelectedResult(null);
    try {
      const data = await apiRequest<ResultDetail>(`/dashboard/results/${resultId}`, {}, token);
      setSelectedResult(data);
    } catch {
      // ignore
    } finally {
      setLoadingResult(false);
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    try {
      await apiRequest(
        `/assessments/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            assessment: {
              title: editTitle,
              description: editDesc,
              time_limit_minutes: editTime,
              passing_score: editPass
            }
          })
        },
        token
      );
      setEditing(false);
      setMsg("Assessment updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function lifecycle(action: "publish" | "archive" | "unarchive") {
    if (!token) return;
    setError("");
    setMsg("");
    try {
      await apiRequest(`/assessments/${id}/${action}`, { method: "POST" }, token);
      setMsg(`Assessment ${action}d.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    }
  }

  function onQTypeChange(newType: string) {
    setQType(newType);
    setQOptions(defaultOptions(newType));
  }

  async function addQuestion(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingQ(true);
    setError("");
    try {
      await apiRequest(
        `/assessments/${id}/questions`,
        {
          method: "POST",
          body: JSON.stringify({
            question: {
              body: qBody,
              question_type: qType,
              points: qPoints,
              options: qOptions.filter((o) => o.body.trim())
            }
          })
        },
        token
      );
      setMsg("Question added.");
      setShowQuestionForm(false);
      setQBody("");
      setQType("multiple_choice");
      setQPoints(1);
      setQOptions(defaultOptions("multiple_choice"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add question");
    } finally {
      setSavingQ(false);
    }
  }

  async function deleteQuestion(questionId: number) {
    if (!token) return;
    if (!confirm("Delete this question?")) return;
    setError("");
    try {
      await apiRequest(`/questions/${questionId}`, { method: "DELETE" }, token);
      setMsg("Question deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (!assessment) {
    return (
      <div className="page-content">
        <p className="empty-state">Loading…</p>
      </div>
    );
  }

  const isDraft = assessment.status === "draft";
  const statusMap: Record<string, string> = {
    draft: "badge--neutral",
    published: "badge--pass",
    archived: "badge--warn"
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <Link className="back-link" href="/recruiter/assessments">← Assessments</Link>
          <h1>{assessment.title}</h1>
          <span className={`badge ${statusMap[assessment.status] ?? "badge--neutral"}`}>
            {assessment.status}
          </span>
        </div>
        <div className="action-row">
          {isDraft && (
            <>
              <button className="button button--ghost" onClick={() => setEditing(true)} type="button">
                Edit
              </button>
              <button
                className="button button--primary"
                disabled={(assessment.questions?.length ?? 0) === 0}
                onClick={() => void lifecycle("publish")}
                title={(assessment.questions?.length ?? 0) === 0 ? "Add questions first" : undefined}
                type="button"
              >
                Publish
              </button>
            </>
          )}
          {assessment.status === "published" && (
            <>
              <Link className="button button--primary" href="/recruiter/invitations">
                Send Invitation
              </Link>
              <button className="button button--ghost" onClick={() => void lifecycle("archive")} type="button">
                Archive
              </button>
            </>
          )}
          {assessment.status === "archived" && (
            <button className="button button--ghost" onClick={() => void lifecycle("unarchive")} type="button">
              Unarchive
            </button>
          )}
        </div>
      </div>

      {msg && <p className="notice notice--success">{msg}</p>}
      {error && <p className="notice notice--error">{error}</p>}

      {editing ? (
        <section className="panel panel--narrow">
          <h2>Edit Assessment</h2>
          <form className="form-stack" onSubmit={saveEdit}>
            <label className="field">
              Title
              <input onChange={(e) => setEditTitle(e.target.value)} required value={editTitle} />
            </label>
            <label className="field">
              Description
              <textarea onChange={(e) => setEditDesc(e.target.value)} rows={3} value={editDesc} />
            </label>
            <div className="form-row">
              <label className="field">
                Time limit (min)
                <input min={1} onChange={(e) => setEditTime(Number(e.target.value))} type="number" value={editTime} />
              </label>
              <label className="field">
                Passing score (%)
                <input max={100} min={0} onChange={(e) => setEditPass(Number(e.target.value))} type="number" value={editPass} />
              </label>
            </div>
            <div className="form-actions">
              <button className="button button--ghost" onClick={() => setEditing(false)} type="button">Cancel</button>
              <button className="button button--primary" type="submit">Save</button>
            </div>
          </form>
        </section>
      ) : (
        <section className="panel panel--meta">
          <dl className="meta-grid">
            <div><dt>Time Limit</dt><dd>{assessment.time_limit_minutes} minutes</dd></div>
            <div><dt>Passing Score</dt><dd>{assessment.passing_score}%</dd></div>
            <div><dt>Questions</dt><dd>{assessment.questions?.length ?? 0}</dd></div>
            <div><dt>Invited</dt><dd>{candidates.length}</dd></div>
          </dl>
          {assessment.description && <p className="muted">{assessment.description}</p>}
        </section>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn${activeTab === "questions" ? " tab-btn--active" : ""}`}
          onClick={() => setActiveTab("questions")}
          type="button"
        >
          Questions ({assessment.questions?.length ?? 0})
        </button>
        <button
          className={`tab-btn${activeTab === "candidates" ? " tab-btn--active" : ""}`}
          onClick={() => { setActiveTab("candidates"); void loadCandidates(); }}
          type="button"
        >
          Candidates ({candidates.length})
        </button>
      </div>

      {activeTab === "questions" && (
        <section className="panel">
          <div className="panel-header">
            <h2>Questions ({assessment.questions?.length ?? 0})</h2>
            {isDraft && (
              <button
                className="button button--primary"
                onClick={() => setShowQuestionForm(!showQuestionForm)}
                type="button"
              >
                {showQuestionForm ? "Cancel" : "Add Question"}
              </button>
            )}
          </div>

          {showQuestionForm && (
            <form className="form-stack question-form" onSubmit={addQuestion}>
              <label className="field">
                Question text *
                <textarea
                  onChange={(e) => setQBody(e.target.value)}
                  placeholder="Enter question text…"
                  required
                  rows={3}
                  value={qBody}
                />
              </label>
              <div className="form-row">
                <label className="field">
                  Type
                  <select onChange={(e) => onQTypeChange(e.target.value)} value={qType}>
                    {QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Points
                  <input min={1} onChange={(e) => setQPoints(Number(e.target.value))} type="number" value={qPoints} />
                </label>
              </div>

              {qType !== "free_text" && (
                <div className="options-block">
                  <p className="field-label">Answer options (mark correct answer)</p>
                  {qOptions.map((opt, idx) => (
                    <div className="option-row-edit" key={idx}>
                      <input
                        checked={opt.correct}
                        name={`correct-${idx}`}
                        onChange={() =>
                          setQOptions((opts) =>
                            opts.map((o, i) => ({ ...o, correct: i === idx }))
                          )
                        }
                        type="radio"
                      />
                      <input
                        disabled={qType === "true_false"}
                        onChange={(e) =>
                          setQOptions((opts) =>
                            opts.map((o, i) => (i === idx ? { ...o, body: e.target.value } : o))
                          )
                        }
                        placeholder={`Option ${idx + 1}`}
                        required={qType !== "true_false"}
                        type="text"
                        value={opt.body}
                      />
                      {qType === "multiple_choice" && qOptions.length > 2 && (
                        <button
                          className="button button--ghost button--sm"
                          onClick={() => setQOptions((opts) => opts.filter((_, i) => i !== idx))}
                          type="button"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {qType === "multiple_choice" && qOptions.length < 6 && (
                    <button
                      className="button button--ghost button--sm"
                      onClick={() => setQOptions((opts) => [...opts, { body: "", correct: false }])}
                      type="button"
                    >
                      + Add option
                    </button>
                  )}
                </div>
              )}

              <div className="form-actions">
                <button className="button button--ghost" onClick={() => setShowQuestionForm(false)} type="button">
                  Cancel
                </button>
                <button className="button button--primary" disabled={savingQ} type="submit">
                  {savingQ ? "Saving…" : "Add Question"}
                </button>
              </div>
            </form>
          )}

          {(assessment.questions?.length ?? 0) === 0 ? (
            <p className="empty-state">No questions yet. Add questions to enable publishing.</p>
          ) : (
            <div className="question-list">
              {assessment.questions.map((q, i) => (
                <article className="question-item" key={q.id}>
                  <div className="question-item-header">
                    <span className="q-num">{i + 1}</span>
                    <div className="q-body-wrap">
                      <p className="q-body">{q.body}</p>
                      <div className="q-meta">
                        <span className="badge badge--neutral">{q.question_type.replace(/_/g, " ")}</span>
                        <span className="muted">{q.points} pt{q.points !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    {isDraft && (
                      <button
                        className="button button--danger button--sm"
                        onClick={() => void deleteQuestion(q.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {q.question_options.length > 0 && (
                    <ul className="option-preview">
                      {q.question_options.map((o) => (
                        <li className={o.correct ? "correct" : ""} key={o.id}>
                          {o.correct ? "✓ " : "○ "}{o.body}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "candidates" && (
        <section className="panel">
          <div className="panel-header">
            <h2>Invited Candidates</h2>
            <Link className="button button--primary" href="/recruiter/invitations">
              + Invite
            </Link>
          </div>

          {candidates.length === 0 ? (
            <p className="empty-state">No candidates invited yet.</p>
          ) : (
            <div className="candidates-layout">
              <div className="candidates-list">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((c) => (
                        <tr
                          className={c.result_id ? "row-clickable" : ""}
                          key={c.id}
                          onClick={() => {
                            if (c.result_id) void openResult(c.result_id);
                          }}
                        >
                          <td>
                            <div>{c.candidate_name || "—"}</div>
                            <small className="muted">{c.candidate_email}</small>
                          </td>
                          <td>
                            <span className={`badge ${SESSION_STATUS_BADGE[c.session_status] ?? "badge--neutral"}`}>
                              {c.session_status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td>
                            {c.score_percentage != null
                              ? `${Number(c.score_percentage).toFixed(1)}%`
                              : "—"}
                          </td>
                          <td>
                            {c.passed === true && <span className="badge badge--pass">Pass</span>}
                            {c.passed === false && <span className="badge badge--fail">Fail</span>}
                            {c.passed == null && "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {(loadingResult || selectedResult) && (
                <div className="result-detail panel">
                  {loadingResult && <p className="empty-state">Loading…</p>}
                  {selectedResult && !loadingResult && (
                    <>
                      <div className="detail-header">
                        <strong>{Number(selectedResult.percentage ?? 0).toFixed(1)}%</strong>
                        {" · "}
                        <span className={selectedResult.passed ? "badge badge--pass" : "badge badge--fail"}>
                          {selectedResult.passed ? "PASS" : "FAIL"}
                        </span>
                        {selectedResult.pending_manual_review && (
                          <span className="badge badge--warn" style={{ marginLeft: 8 }}>Needs review</span>
                        )}
                      </div>
                      <div className="detail-stack" style={{ marginTop: 12 }}>
                        {selectedResult.result_details.map((d) => (
                          <article className="review-card" key={d.id}>
                            <p><strong>{d.question.body}</strong></p>
                            <p className="muted" style={{ fontSize: 12 }}>
                              {d.question.question_type.replace(/_/g, " ")} · {d.question.points} pts
                            </p>
                            <p>
                              <span className="muted">Answer: </span>
                              {d.candidate_answer || <em>No answer</em>}
                            </p>
                            <p>
                              <span className="muted">Score: </span>
                              <strong>{d.score_awarded}</strong> / {d.max_score}
                              {" · "}
                              <span className={d.review_status === "pending_manual_review" ? "badge badge--warn" : "badge badge--neutral"}>
                                {d.review_status.replace(/_/g, " ")}
                              </span>
                            </p>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
