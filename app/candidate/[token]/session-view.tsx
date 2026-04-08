"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type QuestionOption = {
  id: number;
  body: string;
};

type Question = {
  id: number;
  body: string;
  question_type: string;
  question_options: QuestionOption[];
};

type Assessment = {
  title: string;
  description: string;
  time_limit_minutes: number;
  questions: Question[];
};

type SessionPayload = {
  id: number;
  status: string;
  time_remaining_seconds: number;
};

type CandidatePayload = {
  invitation: {
    candidate_name: string;
    candidate_email: string;
    expires_at: string;
  };
  assessment: Assessment;
  session: SessionPayload | null;
  attempt_available: boolean;
  expires_at: string;
};

type AnswerState = Record<number, { selected_option_id?: number; free_text_answer?: string }>;

async function readJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export function CandidateSessionView({ token }: { token: string }) {
  const [payload, setPayload] = useState<CandidatePayload | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void refresh();
  }, [token]);

  useEffect(() => {
    if (!payload?.session || payload.session.status !== "in_progress") {
      return;
    }

    setTimeRemaining(payload.session.time_remaining_seconds || 0);

    const timer = window.setInterval(() => {
      setTimeRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          void submitAnswers();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [payload?.session?.id, payload?.session?.status]);

  useEffect(() => {
    if (!payload?.session || payload.session.status !== "in_progress") {
      return;
    }

    const interval = window.setInterval(() => {
      void autosave();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [answers, payload?.session?.id, payload?.session?.status]);

  async function refresh() {
    try {
      setError("");
      const response = await fetch(`${API_URL}/candidate/session/${token}`);
      const nextPayload = (await readJson(response)) as CandidatePayload & { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(nextPayload.message || nextPayload.error || "Unable to load invitation");
      }

      setPayload(nextPayload);
      setTimeRemaining(nextPayload.session?.time_remaining_seconds || 0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load invitation");
    }
  }

  function buildAnswersPayload() {
    return Object.entries(answers).map(([questionId, value]) => ({
      question_id: Number(questionId),
      selected_option_id: value.selected_option_id,
      free_text_answer: value.free_text_answer
    }));
  }

  async function startSession() {
    try {
      setError("");
      const response = await fetch(`${API_URL}/candidate/session/${token}/start`, {
        method: "POST"
      });
      const nextSession = await readJson(response);

      if (!response.ok) {
        throw new Error(nextSession.message || nextSession.error || "Unable to start session");
      }

      setPayload((current) =>
        current
          ? {
              ...current,
              session: nextSession,
              attempt_available: true
            }
          : current
      );
      setTimeRemaining(nextSession.time_remaining_seconds || 0);
      setStatusMessage("Session started");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to start session");
    }
  }

  async function autosave() {
    if (!payload?.session || payload.session.status !== "in_progress") {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/candidate/session/${token}/autosave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: buildAnswersPayload() })
      });
      const nextPayload = await readJson(response);

      if (!response.ok) {
        throw new Error(nextPayload.message || nextPayload.error || "Autosave failed");
      }

      if (nextPayload.session) {
        setPayload((current) => (current ? { ...current, session: nextPayload.session } : current));
      }

      setStatusMessage(nextPayload.message || "Answers saved");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Autosave failed");
    }
  }

  async function submitAnswers() {
    if (isSubmitting || !payload?.session) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(`${API_URL}/candidate/session/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: buildAnswersPayload() })
      });
      const nextPayload = await readJson(response);

      if (!response.ok) {
        throw new Error(nextPayload.message || nextPayload.error || "Submit failed");
      }

      setStatusMessage(nextPayload.message || "Assessment submitted");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateAnswer(questionId: number, value: { selected_option_id?: number; free_text_answer?: string }) {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        ...value
      }
    }));
  }

  return (
    <main className="page">
      <section className="shell">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Candidate Session</span>
            <h1>{payload?.assessment.title || "Loading assessment"}</h1>
            <p className="lede">
              Invitation token drives a single-attempt assessment session with autosave and
              server-side time enforcement.
            </p>
          </div>

          <Link className="button button--ghost" href="/">
            Back Home
          </Link>
        </div>

        {statusMessage ? <p className="notice notice--success">{statusMessage}</p> : null}
        {error ? <p className="notice notice--error">{error}</p> : null}

        {payload ? (
          <>
            <div className="stats-grid">
              <article className="stat-card">
                <span className="stat-label">Candidate</span>
                <strong>{payload.invitation.candidate_name || payload.invitation.candidate_email}</strong>
              </article>
              <article className="stat-card">
                <span className="stat-label">Expires At</span>
                <strong>{new Date(payload.expires_at).toLocaleString()}</strong>
              </article>
              <article className="stat-card">
                <span className="stat-label">Status</span>
                <strong>{payload.session?.status || "not_started"}</strong>
              </article>
              <article className="stat-card">
                <span className="stat-label">Time Remaining</span>
                <strong>{Math.max(timeRemaining, 0)}s</strong>
              </article>
            </div>

            {!payload.session && payload.attempt_available ? (
              <button className="button button--primary" onClick={() => void startSession()} type="button">
                Start Assessment
              </button>
            ) : null}

            {payload.session?.status === "in_progress" ? (
              <div className="question-stack">
                {payload.assessment.questions.map((question) => (
                  <article className="question-card" key={question.id}>
                    <h2>{question.body}</h2>
                    <p className="question-meta">{question.question_type.replaceAll("_", " ")}</p>

                    {question.question_type === "free_text" ? (
                      <textarea
                        onChange={(event) =>
                          updateAnswer(question.id, { free_text_answer: event.target.value })
                        }
                        rows={5}
                        value={answers[question.id]?.free_text_answer || ""}
                      />
                    ) : (
                      <div className="option-stack">
                        {question.question_options.map((option) => (
                          <label className="option-row" key={option.id}>
                            <input
                              checked={answers[question.id]?.selected_option_id === option.id}
                              name={`question-${question.id}`}
                              onChange={() =>
                                updateAnswer(question.id, { selected_option_id: option.id })
                              }
                              type="radio"
                            />
                            <span>{option.body}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </article>
                ))}

                <div className="actions">
                  <button className="button button--ghost" onClick={() => void autosave()} type="button">
                    Save Progress
                  </button>
                  <button
                    className="button button--primary"
                    disabled={isSubmitting}
                    onClick={() => void submitAnswers()}
                    type="button"
                  >
                    Final Submit
                  </button>
                </div>
              </div>
            ) : null}

            {payload.session && payload.session.status !== "in_progress" ? (
              <div className="panel">
                <h2>Session Closed</h2>
                <p>
                  This invitation can no longer be reopened. Final status:
                  {" "}
                  <strong>{payload.session.status}</strong>
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="empty-state">Loading invitation details...</p>
        )}
      </section>
    </main>
  );
}
