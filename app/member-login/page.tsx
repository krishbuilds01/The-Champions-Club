"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";

export default function MemberAuth() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [planCode, setPlanCode] = useState("gold");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Google Auth state
  const [googleHref, setGoogleHref] = useState("/api/v1/auth/google?type=member");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tab") === "signup") setTab("signup");
    const p = q.get("plan");
    if (p && ["gold", "silver", "junior", "none"].includes(p)) {
      setPlanCode(p);
    }
    if (q.get("error") === "google") {
      setErr("Google sign-in could not be completed. Try again or use your password.");
    } else if (q.get("error") === "gtoken") {
      setErr("Google authorization token exchange failed. Please try again.");
    } else if (q.get("error") === "google_config") {
      setErr("Google OAuth credentials are not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file to enable real Google sign-in.");
    }

    const next = q.get("next") ?? (q.get("tab") === "signup" ? "/courts" : "/member");
    setGoogleHref(`/api/v1/auth/google?type=member&next=${encodeURIComponent(next)}&plan=${encodeURIComponent(p || "gold")}`);
  }, []);

  async function handleLogin(e?: React.FormEvent, customIdent?: string, customPass?: string) {
    if (e) e.preventDefault();
    setErr("");
    setBusy(true);
    const idVal = customIdent ?? identifier.trim();
    const passVal = customPass ?? password;
    try {
      await api.memberLogin({ identifier: idVal, password: passVal });
      const next = new URLSearchParams(window.location.search).get("next") ?? "/member";
      window.location.href = next.startsWith("/") ? next : "/member";
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Sign-in failed. Check your details.");
      setBusy(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) return setErr("Please enter your name.");
    if (!email.trim() || !email.includes("@")) return setErr("Please enter a valid email address.");
    if (phone.replace(/\D/g, "").length < 10) return setErr("Please enter a 10-digit phone number.");
    if (password.length < 4) return setErr("Password should be at least 4 characters.");

    if (planCode === "junior") {
      if (!parentName.trim()) return setErr("Parent or guardian full name is required for Junior membership.");
      if (parentPhone.replace(/\D/g, "").length < 10) return setErr("Parent or guardian 10-digit phone number is required.");
    }

    setBusy(true);
    try {
      await api.memberSignup({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        planCode: planCode === "none" ? undefined : planCode,
        parentName: planCode === "junior" ? parentName.trim() : undefined,
        parentPhone: planCode === "junior" ? parentPhone.trim() : undefined,
        parentEmail: planCode === "junior" && parentEmail.trim() ? parentEmail.trim() : undefined,
        dateOfBirth: planCode === "junior" && dateOfBirth ? dateOfBirth : undefined,
      });
      const next = new URLSearchParams(window.location.search).get("next") ?? "/courts";
      window.location.href = next.startsWith("/") ? next : "/courts";
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Registration failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="auth-page member-auth-page" data-tab={tab}>
      <aside className="auth-aside">
        <Link className="auth-aside-brand" href="/">
          <span>The Champions Club</span>
        </Link>
        <div className="auth-aside-copy">
          <p className="auth-eyebrow">Member portal</p>
          <h2>Your court time starts here.</h2>
          <p>Book a court, keep track of your visits, and get more from every day at the club.</p>
        </div>
        <p className="auth-aside-foot">A better game, together.</p>
      </aside>

      <section className="auth-main">
        <div className="auth-content member-auth-content">
          <div className="auth-mobile-brand">
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>The Champions Club</Link>
          </div>
          <div className="auth-heading">
            <p className="auth-eyebrow">Member portal</p>
            <h1>{tab === "login" ? "Welcome back" : "Join the club"}</h1>
            <p>
              {tab === "login"
                ? "Sign in to manage bookings and member rates."
                : "Create your account and choose a membership."}
            </p>
          </div>

      <div className="auth-card member-auth-card">
        <div className="auth-tabs seg" role="group" aria-label="Sign-in or register">
          <button
            type="button"
            className="flex-1 text-xs uppercase tracking-wider"
            aria-pressed={tab === "login"}
            onClick={() => { setTab("login"); setErr(""); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className="flex-1 text-xs uppercase tracking-wider"
            aria-pressed={tab === "signup"}
            onClick={() => { setTab("signup"); setErr(""); }}
          >
            Create Account
          </button>
        </div>

        {/* GOOGLE AUTH BUTTON */}
        <div className="auth-google-wrap">
          <a
            href={googleHref}
            className="auth-google"
          >
            <span className="flex h-5 w-5 items-center justify-center flex-none">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
              </svg>
            </span>
            <span>{tab === "login" ? "Continue with Google" : "Sign up with Google"}</span>
          </a>

          <div className="auth-divider">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#163021]/10" />
            </div>
            <div>
              Or continue with email
            </div>
          </div>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="form-grid auth-form">
            <div>
              <label htmlFor="m-ident" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                Email or phone number
              </label>
              <input
                id="m-ident"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                placeholder="aarav@example.com or 9811000001"
                required
              />
            </div>
            <div>
              <label htmlFor="m-pass" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                Password
              </label>
              <input
                id="m-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            {err && <div className="notice err" role="alert">{err}</div>}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full rounded-full bg-[#dfff45] py-4 text-xs font-bold uppercase tracking-wider text-[#163021] transition hover:bg-[#163021] hover:text-white disabled:opacity-40"
                disabled={busy || !identifier || !password}
              >
                {busy ? "Signing in..." : "Sign in as Member"}
              </button>
              <p className="auth-help">
                Booked at the front desk? Use your email and phone number as your initial password.
              </p>
            </div>

            <details className="auth-demo">
              <summary>Local demo accounts</summary>
              <div className="auth-demo-content auth-member-demos">
                <button
                  type="button"
                  className="auth-demo-member"
                  onClick={() => handleLogin(undefined, "aarav@example.com", "demo1234")}
                >
                  <span>⚡ Aarav Mehta</span>
                  <span>Active Gold Plan</span>
                </button>
                <button
                  type="button"
                  className="auth-demo-member"
                  onClick={() => handleLogin(undefined, "rahul@example.com", "demo1234")}
                >
                  <span>⚡ Rahul Verma</span>
                  <span>No Plan Yet (Free)</span>
                </button>
              </div>
            </details>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="form-grid auth-form">
            <div className="auth-fields">
              <div>
              <label htmlFor="reg-name" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                Full Name
              </label>
              <input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohan Patel"
                required
              />
              </div>
              <div>
              <label htmlFor="reg-email" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohan@example.com"
                required
              />
              </div>
              <div>
              <label htmlFor="reg-phone" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                10-Digit Phone
              </label>
              <input
                id="reg-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                required
              />
              </div>
              <div>
              <label htmlFor="reg-pass" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                Create Password
              </label>
              <input
                id="reg-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 4 characters"
                required
              />
              </div>
            </div>

            <div className="auth-plan-field">
              <label htmlFor="member-plan">Membership tier</label>
              <select id="member-plan" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
                <option value="gold">Gold — ₹1,500 / month</option>
                <option value="silver">Silver — ₹1,000 / month</option>
                <option value="junior">Junior — ₹600 / month</option>
                <option value="none">Decide later — free</option>
              </select>
              <p>
                {planCode === "gold" && "Member court rates and club discounts."}
                {planCode === "silver" && "Member court rates and club discounts."}
                {planCode === "junior" && "Junior membership requires a parent or guardian."}
                {planCode === "none" && "Choose a membership later."}
              </p>
            </div>

            {planCode === "junior" && (
              <div className="rounded-2xl border-2 border-[#163021]/20 bg-[#f7f9f6] p-4 text-[#163021] space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="text-base">🛡️</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#163021]">Parent / Guardian Details (Minor Required)</p>
                    <p className="text-[11px] text-[#617065]">Junior membership is reserved for minors under 18. Emergency contact and parental consent details are mandatory.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="reg-pname" className="text-[11px] font-semibold uppercase tracking-wider text-[#163021]">
                      Parent/Guardian Full Name *
                    </label>
                    <input
                      id="reg-pname"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-pphone" className="text-[11px] font-semibold uppercase tracking-wider text-[#163021]">
                      Parent Phone Number *
                    </label>
                    <input
                      id="reg-pphone"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="e.g. 9811223344"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-pemail" className="text-[11px] font-semibold uppercase tracking-wider text-[#163021]">
                      Parent Email (Optional)
                    </label>
                    <input
                      id="reg-pemail"
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-dob" className="text-[11px] font-semibold uppercase tracking-wider text-[#163021]">
                      Junior Date of Birth
                    </label>
                    <input
                      id="reg-dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {err && <div className="notice err" role="alert">{err}</div>}

            <div>
              <button
                type="submit"
                className="w-full rounded-full bg-[#dfff45] py-4 text-xs font-bold uppercase tracking-wider text-[#163021] transition hover:bg-[#163021] hover:text-white disabled:opacity-40"
                disabled={busy}
              >
                {busy
                  ? "Creating account..."
                  : planCode === "gold"
                  ? "Join Gold & Create Account (₹1,500/mo)"
                  : planCode === "silver"
                  ? "Join Silver & Create Account (₹1,000/mo)"
                  : planCode === "junior"
                  ? "Join Junior & Create Account (₹600/mo)"
                  : "Create Free Member Account"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="auth-switch-link">
        Club staff or till operator?{" "}
        <Link href="/login" className="font-semibold text-[#163021] underline hover:text-black">
          Staff sign-in here
        </Link>
      </div>
        </div>
      </section>
    </main>
  );
}
