"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";

// Staff sign-in. Owners and desk staff use email and password; the till
// uses the 4-digit PIN. Members never sign in: they book by name.
export default function Login() {
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      if (mode === "password") await api.login(email.trim(), password);
      else await api.loginPin(pin);
      const next = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
      window.location.href = next.startsWith("/") ? next : "/dashboard";
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="wrap page" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <h1 className="page-title">Staff sign-in</h1>
        <p className="sub">Dashboard, bookings, members and the bar till live behind this.</p>
      </div>

      <div className="seg" role="group" aria-label="Sign-in method" style={{ marginBottom: 20 }}>
        <button aria-pressed={mode === "password"} onClick={() => setMode("password")}>Email &amp; password</button>
        <button aria-pressed={mode === "pin"} onClick={() => setMode("pin")}>Till PIN</button>
      </div>

      <div className="form-grid">
        {mode === "password" ? (
          <>
            <div>
              <label htmlFor="l-email">Email</label>
              <input id="l-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label htmlFor="l-pass">Password</label>
              <input id="l-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="l-pin">4-digit PIN</label>
            <input
              id="l-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••"
            />
          </div>
        )}
        {err && <div className="notice err" role="alert">{err}</div>}
        <div>
          <button
            className="btn btn-ink"
            disabled={busy || (mode === "password" ? !email || !password : pin.length !== 4)}
            onClick={submit}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
