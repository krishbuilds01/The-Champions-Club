"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";

// Staff sign-in: email and password, or Google for club accounts.
// Members have their own sign-in (linked under the card).
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleHref, setGoogleHref] = useState("/api/v1/auth/google");

  // Only a same-site relative path is a safe place to land after
  // sign-in: it must start with "/" but not "//" (protocol-relative)
  // and must not contain "://".
  const safeNext = (n: string | null) =>
    n && n.startsWith("/") && !n.startsWith("//") && !n.includes("://") ? n : null;

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("error") === "notstaff") setErr("That Google account is not a club account.");
    else if (q.get("error") === "gstate") setErr("Google session expired. Try signing in again.");
    else if (q.get("error") === "ginfo" || q.get("error") === "gemail") setErr("Could not retrieve verified email from Google.");
    else if (q.get("error") === "google") setErr("Google sign-in did not work. Try again, or use your password.");
    const next = safeNext(q.get("next"));
    if (next) setGoogleHref(`/api/v1/auth/google?next=${encodeURIComponent(next)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function go(e: string, p: string) {
    setErr("");
    setBusy(true);
    try {
      const { staff } = await api.login(e, p);
      const next = new URLSearchParams(window.location.search).get("next");
      // Land each role on a page it can actually use; an explicit
      // "next" from a guarded page always wins.
      const home = staff.role === "OWNER" ? "/dashboard"
        : staff.role === "BAR" ? "/bar"
        : staff.role === "SHOP" ? "/shop"
        : "/bookings";
      window.location.href = safeNext(next) ?? home;
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="wrap page login-main" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <span className="badge-mark">CC</span>
        <h1 className="page-title">Sign in</h1>
        <p className="sub">Everything behind the desk, in one place.</p>
      </div>

      <div className="panel login-card">
      <a className="btn btn-google" href={googleHref}>
        <span className="g-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
          </svg>
        </span>
        Continue with Google
      </a>
      <div className="or-row"><span>or</span></div>

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

      <p className="member-link" style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 2 }}>
        A club member? <Link href="/member/login">Member sign in</Link>
      </p>
      </div>
    </main>
  );
}
