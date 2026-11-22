"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import type { StaffMemberPinDTO } from "@/lib/types";

type RoleOption = {
  id: "OWNER" | "FRONT_DESK" | "BAR" | "SHOP";
  label: string;
  category: "General" | "Bar & Café" | "Pro Shop";
  icon: string;
};

const ROLES: RoleOption[] = [
  { id: "OWNER", label: "Club Owner", category: "General", icon: "👑" },
  { id: "FRONT_DESK", label: "Club Staff", category: "General", icon: "📋" },
  { id: "BAR", label: "Bar & Cafeteria Staff", category: "Bar & Café", icon: "🍸" },
  { id: "SHOP", label: "Pro Shop Staff", category: "Pro Shop", icon: "🛍️" },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<RoleOption["id"]>("OWNER");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [staffList, setStaffList] = useState<StaffMemberPinDTO[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

  // Only a same-site relative path is a safe place to land after
  // sign-in: it must start with "/" but not "//" (protocol-relative)
  // and must not contain "://".
  const safeNext = (n: string | null) =>
    n && n.startsWith("/") && !n.startsWith("//") && !n.includes("://") ? n : null;

  useEffect(() => {
    api.staffProfiles().then((res) => {
      setStaffList(res.staff as any || []);
    }).catch(() => {});
  }, []);

  function getRedirectUrl(role: string) {
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    if (next) return next;
    if (role === "OWNER") return "/dashboard";
    if (role === "BAR" || role === "BAR_STAFF") return "/bar";
    if (role === "SHOP" || role === "SHOP_STAFF") return "/shop";
    return "/bookings";
  }

  async function handlePinLogin(role: RoleOption["id"], enteredPin: string, staffId?: number | null) {
    setErr("");
    if (!enteredPin.trim()) {
      setErr("Please enter the PIN for " + (ROLES.find((r) => r.id === role)?.label || role));
      return;
    }
    setBusy(true);
    try {
      const { staff } = await api.pinLogin(role, enteredPin.trim(), staffId || undefined);
      window.location.href = getRedirectUrl(staff.role);
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Incorrect PIN. Try again.");
      setBusy(false);
    }
  }

  async function goDemo(e: string, p: string) {
    setErr("");
    setBusy(true);
    try {
      const { staff } = await api.login(e, p);
      window.location.href = getRedirectUrl(staff.role);
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Demo sign-in failed. Try again.");
      setBusy(false);
    }
  }

  const activeRoleObj = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

  const roleStaffMembers = staffList.filter((s) => {
    if (selectedRole === "FRONT_DESK") return s.role === "FRONT_DESK" || s.role === "STAFF";
    if (selectedRole === "BAR") return s.role === "BAR";
    if (selectedRole === "SHOP") return s.role === "SHOP";
    if (selectedRole === "OWNER") return s.role === "OWNER";
    return s.role === selectedRole;
  });

  const effectiveStaffId = selectedStaffId && roleStaffMembers.some((s) => s.id === selectedStaffId)
    ? selectedStaffId
    : roleStaffMembers[0]?.id || null;

  const activeStaffMember = roleStaffMembers.find((s) => s.id === effectiveStaffId);

  return (
    <main className="auth-page staff-auth-page">
      <aside className="auth-aside">
        <Link className="auth-aside-brand" href="/">
          <span>The Champions Club</span>
        </Link>
        <div className="auth-aside-copy">
          <p className="auth-eyebrow">Staff portal</p>
          <h2>Make every club day run smoothly.</h2>
          <p>Manage bookings, members, service, and the team—right where the game happens.</p>
        </div>
        <p className="auth-aside-foot">Courts open daily · 6 AM – 10 PM</p>
      </aside>

      <section className="auth-main">
        <div className="auth-content">
          <div className="auth-mobile-brand">
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>The Champions Club</Link>
          </div>
          <div className="auth-heading">
            <p className="auth-eyebrow">Welcome back</p>
            <h1>Staff sign in</h1>
            <p>Choose your role and enter your assigned PIN.</p>
          </div>

      <div className="panel login-card auth-card">
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--pine)" }}>
            Select your role
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ROLES.map((r) => {
              const active = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(r.id);
                    setPin("");
                    setErr("");
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: active ? "2px solid #163021" : "1px solid var(--line)",
                    background: active ? "#dfff45" : "var(--surface)",
                    color: "#163021",
                    fontWeight: active ? 700 : 500,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{r.icon}</span>
                  <div>
                    <span style={{ display: "block", lineHeight: 1.2 }}>{r.label}</span>
                    <span style={{ fontSize: 10, color: "#555" }}>{r.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {roleStaffMembers.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 6, color: "var(--pine)" }}>
              Staff Profile (Name)
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {roleStaffMembers.map((s) => {
                const isSelected = effectiveStaffId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(s.id);
                      setPin("");
                      setErr("");
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: isSelected ? "2px solid #163021" : "1px solid var(--line)",
                      background: isSelected ? "#163021" : "var(--surface)",
                      color: isSelected ? "#dfff45" : "#163021",
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>👤 {s.name}</span>
                    {s.hasCustomPin && (
                      <span style={{ fontSize: 9, opacity: 0.85 }}>(PIN Set)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePinLogin(selectedRole, pin, effectiveStaffId);
          }}
          className="form-grid"
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label htmlFor="l-pin" style={{ fontSize: 13, fontWeight: 600, color: "var(--pine)" }}>
                {activeStaffMember ? `${activeStaffMember.name}'s PIN` : `${activeRoleObj.label} PIN`}
              </label>
              <span className="auth-field-hint">
                {activeStaffMember?.hasCustomPin ? "Custom PIN" : "Assigned PIN"}
              </span>
            </div>
            <input
              id="l-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              placeholder="••••"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
              autoFocus
              style={{
                fontSize: 22,
                letterSpacing: 6,
                textAlign: "center",
                fontWeight: 700,
              }}
            />
          </div>

          {err && <div className="notice err" role="alert">{err}</div>}

          <div>
            <button
              type="submit"
              className="btn btn-ink"
              disabled={busy || pin.length < 4}
              style={{ width: "100%", justifyContent: "center", minHeight: 46, fontSize: 15 }}
            >
              {busy
                ? "Authenticating..."
                : activeStaffMember
                ? `Sign in as ${activeStaffMember.name}`
                : `Sign in as ${activeRoleObj.label}`}
            </button>
          </div>
        </form>

        <details className="auth-demo">
          <summary>Local demo accounts</summary>
          <div className="auth-demo-content">
            <p>For local evaluation only.</p>
            <div className="auth-demo-grid">
              <button
                type="button"
                className="btn btn-ink"
                onClick={() => goDemo("owner@champions.club", "champions")}
                disabled={busy}
                style={{ fontSize: 12, padding: "8px 6px" }}
              >
                👑 CLUB OWNER
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => goDemo("neha@champions.club", "demo1234")}
                disabled={busy}
                style={{ fontSize: 12, padding: "8px 6px" }}
              >
                📋 CLUB STAFF
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => goDemo("arjun@champions.club", "demo1234")}
                disabled={busy}
                style={{ fontSize: 12, padding: "8px 6px" }}
              >
                🍸 BAR STAFF
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => goDemo("meera@champions.club", "demo1234")}
                disabled={busy}
                style={{ fontSize: 12, padding: "8px 6px" }}
              >
                🛍️ SHOP STAFF
              </button>
            </div>
          </div>
        </details>
      </div>

      <p className="member-link auth-switch-link">
        A club member? <Link href="/member-login">Member sign in</Link>
      </p>
        </div>
      </section>
    </main>
  );
}
