"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";

// Staff sign-in: email and password only. Members never sign in,
// they book by name. The demo button signs in as the club owner.
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e: string, p: string) {
    setErr("");
    setBusy(true);
    try {
<<<<<<< HEAD
      if (mode === "password") await api.login(email.trim(), password);
      else await api.loginPin(pin);
=======
      await api.login(e, p);
>>>>>>> 9119cdb312dbba6b7a24f12c1717680edfdaba51
      const next = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
      window.location.href = next.startsWith("/") ? next : "/dashboard";
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="wrap page" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <span className="badge-mark">CC</span>
        <h1 className="page-title">Staff sign-in</h1>
        <p className="sub">Dashboard, bookings, members and the bar till live behind this.</p>
      </div>

      <div className="form-grid">
        <div>
          <label htmlFor="l-email">Email</label>
          <input id="l-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label htmlFor="l-pass">Password</label>
          <input id="l-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {err && <div className="notice err" role="alert">{err}</div>}
        <div>
          <button className="btn btn-ink" disabled={busy || !email || !password} onClick={() => go(email.trim(), password)}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>

      <div className="demo-box">
        <p><strong>Just looking around?</strong> One tap, no typing.</p>
        <div>
          <button className="btn btn-primary" onClick={() => go("owner@champions.club", "champions")} disabled={busy}>Enter the demo</button>
        </div>
        <p className="demo-creds">Demo login: owner@champions.club · champions</p>
      </div>
    </main>
  );
}
