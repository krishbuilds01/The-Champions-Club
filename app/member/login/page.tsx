"use client";
import { useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";

// Member sign-in: the email on the member's record and their
// password (the first one is their phone number, set by the desk).
export default function MemberLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e: string, p: string) {
    setErr("");
    setBusy(true);
    try {
      await api.memberLogin(e, p);
      window.location.href = "/member";
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="wrap page login-main" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <span className="badge-mark">CC</span>
        <h1 className="page-title">Member sign in</h1>
        <p className="sub">Your plan, bookings and orders in one place.</p>
      </div>

      <div className="panel login-card">
        <div className="form-grid">
          <div>
            <label htmlFor="ml-email">Email</label>
            <input id="ml-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label htmlFor="ml-pass">Password</label>
            <input id="ml-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {err && <div className="notice err" role="alert">{err}</div>}
          <div>
            <button className="btn btn-ink" disabled={busy || !email || !password} onClick={() => go(email.trim(), password)}>
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </div>
        <p className="demo-creds" style={{ marginTop: 14 }}>
          First time? Your first password is your phone number — the front desk can add your email if it is missing.
        </p>
        <div className="demo-box">
          <p><strong>Demo member</strong> — one tap.</p>
          <button className="btn btn-quiet" style={{ width: "100%" }} disabled={busy} onClick={() => go("aarav.mehta@gmail.com", "9811000001")}>
            Sign in as Aarav Mehta (Gold)
          </button>
        </div>
      </div>
      <p className="member-link">
        Club staff? <Link href="/login">Staff sign in</Link>
      </p>
    </main>
  );
}
