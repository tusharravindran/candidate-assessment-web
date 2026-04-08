"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useAuth } from "../../lib/auth";

export default function SignUpPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp(name, email, password, orgName);
      router.push("/recruiter");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page page--centered">
      <section className="auth-card">
        <span className="eyebrow">Recruiter Portal</span>
        <h1>Create Account</h1>
        <p className="lede">Each account creates a new isolated organization.</p>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            Organization name
            <input
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Recruiting"
              required
              value={orgName}
            />
          </label>
          <label className="field">
            Your name
            <input
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              value={name}
            />
          </label>
          <label className="field">
            Email
            <input
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="field">
            Password
            <input
              autoComplete="new-password"
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && <p className="notice notice--error">{error}</p>}
          <button className="button button--primary" disabled={loading} type="submit">
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link href="/recruiter/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
