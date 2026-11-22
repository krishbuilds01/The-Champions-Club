"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { api } from "@/lib/api";
import type { MemberSessionDTO, StaffDTO } from "@/lib/types";

const publicLinks = [
  { href: "/courts", label: "Courts" },
  { href: "/shop", label: "Shop" },
  { href: "/bar", label: "Bar & Café" },
  { href: "/trial", label: "Book a trial" },
  { href: "/#membership", label: "Membership" },
];

const staffLinksFor = (role: StaffDTO["role"]) => {
  const desk = [
    { href: "/bookings", label: "Bookings" },
    { href: "/members", label: "Members" },
    { href: "/enquiries", label: "Enquiries" },
  ];
  if (role === "OWNER")
    return [
      { href: "/dashboard", label: "Dashboard" },
      ...desk,
      { href: "/bar", label: "Bar" },
      { href: "/shop", label: "Shop" },
    ];
  if (role === "FRONT_DESK" || role === "STAFF") return desk;
  if (role === "BAR") return [{ href: "/bar", label: "Bar & Cafeteria" }];
  return [{ href: "/shop", label: "Pro Shop" }];
};

const roleLabel: Record<StaffDTO["role"], string> = {
  OWNER: "Owner",
  FRONT_DESK: "Front desk",
  STAFF: "Club staff",
  BAR: "Bar staff",
  SHOP: "Shop staff",
};

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<StaffDTO | null>(null);
  const [member, setMember] = useState<MemberSessionDTO | null>(null);
  const path = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    api.me()
      .then((r) => setStaff(r.staff))
      .catch(() => setStaff(null));
    api.memberMe()
      .then((r) => setMember(r.member))
      .catch(() => setMember(null));
  }, [path]);

  async function signStaffOut() {
    await api.logout().catch(() => {});
    setStaff(null);
    window.location.href = "/";
  }

  async function signMemberOut() {
    await api.memberLogout().catch(() => {});
    setMember(null);
    window.location.href = "/";
  }

  const links = staff
    ? staffLinksFor(staff.role)
    : member
    ? [
        { href: "/courts", label: "Courts" },
        { href: "/member", label: "My Club" },
        { href: "/shop", label: "Shop" },
        { href: "/bar", label: "Bar & Café" },
        { href: "/#membership", label: "Membership" },
      ]
    : publicLinks;

  const isCurrent = (href: string) =>
    href.startsWith("/#")
      ? path === "/"
      : path === href || (href !== "/" && path.startsWith(`${href}/`));

  const isLanding = path === "/";

  return (
    <header className={`nav ${isLanding ? "nav-glass" : ""}`}>
      <div className="nav-in">
        <Link className="brand" href="/" aria-label="The Champions Club, home">
          <span className="brand-words">
            <b>Champions</b>
            <small>The Club</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Club Navigation">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isCurrent(l.href) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav-end">
          {staff ? (
            <>
              <span className="staff-chip">
                {staff.name}
                <span className="chip-role">{roleLabel[staff.role]}</span>
              </span>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={signStaffOut}
              >
                Sign out
              </button>
            </>
          ) : member ? (
            <>
              <Link
                href="/member"
                className="member-chip"
                title="View my club portal & bookings"
              >
                <span>⚡ {member.name}</span>
                <span className="chip-tier">
                  {member.plan ? member.plan.name : "Free"}
                </span>
              </Link>
              <Link className="btn btn-ink" href="/courts">
                Book a court
              </Link>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={signMemberOut}
              >
                Sign out
              </button>
            </>
          ) : isLanding ? (
            <>
              <Link className="btn btn-paper" href="/member-login">
                Member sign-in
              </Link>
              <Link
                className="btn btn-ink"
                href="/login"
                title="Staff portal sign in"
              >
                Staff sign-in
              </Link>
            </>
          ) : (
            <>
              <Link className="nav-signin-link" href="/member-login">
                Member sign-in
              </Link>
              <Link
                className="btn btn-quiet nav-staff-link"
                href="/login"
                title="Staff portal sign in"
              >
                Staff
              </Link>
              <Link className="btn btn-ink" href="/member-login?tab=signup">
                Join the club
              </Link>
            </>
          )}

          <button
            className="menu-btn"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-controls="club-mobile-navigation"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="nav-mobile" id="club-mobile-navigation" aria-label="Club">
          <div className="nav-mobile-links">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isCurrent(l.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="nav-mobile-actions">
            {staff ? (
              <>
                <div className="mobile-chip">
                  {staff.name} · {roleLabel[staff.role]}
                </div>
                <button
                  type="button"
                  className="mobile-signout"
                  onClick={() => {
                    setOpen(false);
                    signStaffOut();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : member ? (
              <>
                <Link
                  href="/member"
                  className="mobile-chip"
                  onClick={() => setOpen(false)}
                >
                  ⚡ {member.name} ({member.plan ? member.plan.name : "Free"})
                </Link>
                <Link
                  href="/courts"
                  className="btn btn-ink"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setOpen(false)}
                >
                  Book a court
                </Link>
                <button
                  type="button"
                  className="mobile-signout"
                  onClick={() => {
                    setOpen(false);
                    signMemberOut();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : isLanding ? (
              <div className="nav-mobile-auth-grid">
                <Link
                  href="/member-login"
                  className="btn btn-paper"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setOpen(false)}
                >
                  Member sign-in
                </Link>
                <Link
                  href="/login"
                  className="btn btn-ink"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setOpen(false)}
                >
                  Staff sign-in
                </Link>
              </div>
            ) : (
              <div className="nav-mobile-auth-grid">
                <Link
                  href="/member-login"
                  className="btn btn-paper"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setOpen(false)}
                >
                  Member sign-in
                </Link>
                <Link
                  href="/member-login?tab=signup"
                  className="btn btn-ink"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setOpen(false)}
                >
                  Join the club
                </Link>
                <Link
                  href="/login"
                  className="btn btn-quiet"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setOpen(false)}
                >
                  Staff sign-in
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
