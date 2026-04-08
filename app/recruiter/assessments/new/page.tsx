"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useAuth } from "../../../lib/auth";
import { apiRequest } from "../../../lib/api";

export default function NewAssessmentPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState(60);
  const [passingScore, setPassingScore] = useState(70);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest<{ id: number }>(
        "/assessments",
        {
          method: "POST",
          body: JSON.stringify({
            assessment: {
              title,
              description,
              time_limit_minutes: timeLimit,
              passing_score: passingScore
            }
          })
        },
        token
      );
      router.push(`/recruiter/assessments/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assessment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>New Assessment</h1>
      </div>

      <section className="panel panel--narrow">
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            Title *
            <input
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Rails Engineer Screen"
              required
              value={title}
            />
          </label>

          <label className="field">
            Description
            <textarea
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description shown to candidates"
              rows={3}
              value={description}
            />
          </label>

          <div className="form-row">
            <label className="field">
              Time limit (minutes)
              <input
                min={1}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                required
                type="number"
                value={timeLimit}
              />
            </label>

            <label className="field">
              Passing score (%)
              <input
                max={100}
                min={0}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                required
                type="number"
                value={passingScore}
              />
            </label>
          </div>

          {error && <p className="notice notice--error">{error}</p>}

          <div className="form-actions">
            <button
              className="button button--ghost"
              onClick={() => router.back()}
              type="button"
            >
              Cancel
            </button>
            <button className="button button--primary" disabled={loading} type="submit">
              {loading ? "Creating…" : "Create Assessment"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
