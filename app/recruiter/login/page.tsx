"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useAuth } from "../../lib/auth";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/recruiter");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page page--centered">
      <section className="auth-card">
        <span className="eyebrow">Recruiter Portal</span>
        <h1>Sign In</h1>
        <p className="lede">Access your tenant-scoped dashboard.</p>

        <form className="form-stack" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && <p className="notice notice--error">{error}</p>}
          <button className="button button--primary" disabled={loading} type="submit">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="auth-switch">
          No account?{" "}
          <Link href="/recruiter/signup">Create one</Link>
        </p>
      </section>
    </main>
  );
}
