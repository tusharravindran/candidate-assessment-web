"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../lib/auth";
import { apiRequest } from "../../lib/api";

type Assessment = { id: number; title: string; status: string };
type Invitation = {
  id: number;
  candidate_email: string;
  candidate_name: string | null;
  token: string;
  expires_at: string;
  used: boolean;
  invitation_url: string;
  assessment: { id: number; title: string };
};

export default function InvitationsPage() {
  const { token } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // form state
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [aData, iData] = await Promise.all([
        apiRequest<{ assessments: Assessment[] }>("/assessments?per_page=100", {}, token),
        apiRequest<{ invitations: Invitation[]; meta: { total_count: number } }>(
          "/invitations?per_page=50",
          {},
          token
        )
      ]);
      setAssessments(aData.assessments.filter((a) => a.status === "published"));
      setInvitations(iData.invitations);
      setTotal(iData.meta.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendInvitation(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSending(true);
    setError("");
    setMsg("");
    try {
      await apiRequest(
        "/invitations",
        {
          method: "POST",
          body: JSON.stringify({
            invitation: {
              assessment_id: selectedAssessment,
              candidate_email: candidateEmail,
              candidate_name: candidateName || undefined
            }
          })
        },
        token
      );
      setMsg("Invitation created. Copy the link below.");
      setCandidateEmail("");
      setCandidateName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setSending(false);
    }
  }

  async function deleteInvitation(id: number) {
    if (!token) return;
    if (!confirm("Revoke this invitation?")) return;
    setError("");
    try {
      await apiRequest(`/invitations/${id}`, { method: "DELETE" }, token);
      setMsg("Invitation revoked.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function copyLink(url: string, tok: string) {
    await navigator.clipboard.writeText(url);
    setCopiedToken(tok);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Invitations</h1>
          <p className="lede">{total} total · send unique candidate links for published assessments</p>
        </div>
      </div>

      {msg && <p className="notice notice--success">{msg}</p>}
      {error && <p className="notice notice--error">{error}</p>}

      <section className="panel panel--narrow">
        <h2>Send New Invitation</h2>
        {assessments.length === 0 ? (
          <p className="notice notice--warning">No published assessments. Publish an assessment before sending invitations.</p>
        ) : (
          <form className="form-stack" onSubmit={sendInvitation}>
            <label className="field">
              Assessment *
              <select
                onChange={(e) => setSelectedAssessment(e.target.value)}
                required
                value={selectedAssessment}
              >
                <option value="">Select a published assessment…</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label className="field">
                Candidate email *
                <input
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  required
                  type="email"
                  value={candidateEmail}
                />
              </label>
              <label className="field">
                Candidate name
                <input
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Jane Smith"
                  value={candidateName}
                />
              </label>
            </div>
            <div className="form-actions">
              <button className="button button--primary" disabled={sending} type="submit">
                {sending ? "Sending…" : "Create Invitation"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <h2>All Invitations</h2>
        {invitations.length === 0 ? (
          <p className="empty-state">No invitations yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Assessment</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Link</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <div>{inv.candidate_name || "—"}</div>
                      <small className="muted">{inv.candidate_email}</small>
                    </td>
                    <td>{inv.assessment.title}</td>
                    <td>
                      <small>{new Date(inv.expires_at).toLocaleDateString()}</small>
                    </td>
                    <td>
                      {inv.used ? (
                        <span className="badge badge--neutral">Used</span>
                      ) : new Date(inv.expires_at) < new Date() ? (
                        <span className="badge badge--warn">Expired</span>
                      ) : (
                        <span className="badge badge--pass">Active</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="button button--ghost button--sm"
                        onClick={() => void copyLink(inv.invitation_url, inv.token)}
                        type="button"
                      >
                        {copiedToken === inv.token ? "Copied!" : "Copy Link"}
                      </button>
                    </td>
                    <td>
                      {!inv.used && (
                        <button
                          className="button button--danger button--sm"
                          onClick={() => void deleteInvitation(inv.id)}
                          type="button"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
