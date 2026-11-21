"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import type { StaffDTO } from "@/lib/types";

const publicLinks = [
  { href: "/courts", label: "Courts" },
  { href: "/#plans", label: "Membership" },
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
  if (role === "OWNER") return [{ href: "/dashboard", label: "Dashboard" }, ...desk];
  if (role === "FRONT_DESK" || role === "STAFF") return desk;
  return [];
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

  const links = staff ? [...publicLinks, ...staffLinksFor(staff.role)] : publicLinks;

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
              <span className="staff-name">{staff.name}</span>
              <button className="btn btn-quiet" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <Link className="btn btn-quiet" href="/login">Staff sign-in</Link>
          )}
          <Link className="btn btn-ink" href="/trial">Book a free trial</Link>
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
          <Link href="/trial">Book a free trial</Link>
          {staff ? (
            <button className="mobile-signout" onClick={signOut}>Sign out ({staff.name})</button>
          ) : (
            <Link href="/login">Staff sign-in</Link>
          )}
        </nav>
      )}
    </header>
  );
}
