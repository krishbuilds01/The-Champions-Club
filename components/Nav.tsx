"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import type { StaffDTO } from "@/lib/types";

const publicLinks = [
  { href: "/courts", label: "Courts" },
  { href: "/#membership", label: "Membership" },
  { href: "/shop", label: "Shop" },
  { href: "/bar", label: "Bar & Café" },
];

const staffLinksFor = (role: StaffDTO["role"]) => {
  const desk = [
    { href: "/inventory", label: "Inventory" },
    { href: "/bookings", label: "Bookings" },
    { href: "/members", label: "Members" },
    { href: "/enquiries", label: "Enquiries" },
  ];
  if (role === "OWNER") return [{ href: "/dashboard", label: "Dashboard" }, ...desk, { href: "/bar", label: "Bar" }, { href: "/shop", label: "Shop" }];
  if (role === "FRONT_DESK" || role === "STAFF") return desk;
  if (role === "BAR") return [{ href: "/bar", label: "Bar" }];
  return [{ href: "/shop", label: "Shop" }];
};
const roleLabel: Record<StaffDTO["role"], string> = {
  OWNER: "Owner",
  FRONT_DESK: "Front desk",
  STAFF: "Staff",
  BAR: "Bar",
  SHOP: "Shop",
};

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<StaffDTO | null>(null);
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
  }, [path]);

  async function signOut() {
    await api.logout().catch(() => {});
    setStaff(null);
    window.location.href = "/";
  }

  const links = staff ? staffLinksFor(staff.role) : publicLinks;

  return (
    <header className="nav">
      <div className="nav-in">
        <Link className="brand" href="/" aria-label="The Champions Club, home">
          <span className="brand-mark">CC</span>
          <span className="brand-words"><b>Champions</b><small>The club</small></span>
        </Link>
        <nav className="nav-links" aria-label="Club">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>{l.label}</Link>
          ))}
        </nav>
        <div className="nav-end">
          {staff ? (
            <>
              <span className="staff-chip">{staff.name}<span className="chip-role">{roleLabel[staff.role]}</span></span>
              <button className="btn btn-quiet" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link className="btn btn-paper" href="/login">Sign in</Link>
              <Link className="btn btn-ink" href="/trial">Book a free trial</Link>
            </>
          )}
          <button className="menu-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {open && (
        <nav className="nav-mobile" aria-label="Club">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
          {staff ? (
            <>
              <span className="mobile-chip">{staff.name} · {roleLabel[staff.role]}</span>
              <button className="mobile-signout" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/trial">Book a free trial</Link>
              <Link href="/login">Sign in</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
