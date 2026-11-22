"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Nav from "./Nav";
import { api } from "@/lib/api";
import type { StaffDTO } from "@/lib/types";

export default function Chrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [staff, setStaff] = useState<StaffDTO | null>(null);
  const isAuthPage = path === "/login" || path === "/member-login" || path === "/member/login";

  useEffect(() => {
    api.me()
      .then((r) => setStaff(r.staff))
      .catch(() => setStaff(null));
  }, [path]);

  // Auth pages (login, member-login) render without navigation chrome
  if (isAuthPage) return <>{children}</>;

  const desk = staff && (staff.role === "OWNER" || staff.role === "FRONT_DESK" || staff.role === "STAFF");
  const barShop = staff && (staff.role === "BAR" || staff.role === "SHOP");

  return (
    <div className="shell">
      <Nav />
      {children}
      {path !== "/" && (
        <footer className="footer">
          <div className="wrap footer-in">
            <div>
              <p className="footer-brand">The Champions Club</p>
              <p className="muted">
                Courts open 6 AM to 10 PM, every day.
                <br />
                Front desk:{" "}
                <a href="mailto:frontdesk@champions.club">
                  frontdesk@champions.club
                </a>
              </p>
            </div>
            <nav>
              <Link href="/courts">Courts</Link>
              <Link href="/trial">Free trial</Link>
              <Link href="/#membership">Membership</Link>
              <Link href="/plans">Plans &amp; prices</Link>
            </nav>
            <nav>
              <Link href="/shop">Shop</Link>
              <Link href="/bar">Bar &amp; Café</Link>
            </nav>
            {desk ? (
              <nav>
                {staff.role === "OWNER" && (
                  <Link href="/dashboard">Dashboard</Link>
                )}
                <Link href="/bookings">Bookings</Link>
                <Link href="/leave">Leave</Link>
                <Link href="/members">Members</Link>
                <Link href="/enquiries">Enquiries</Link>
                {staff.role === "OWNER" && <Link href="/orders">Orders</Link>}
                {staff.role === "OWNER" && <Link href="/reports">Reports</Link>}
                {staff.role === "OWNER" && <Link href="/staff">Staff</Link>}
              </nav>
            ) : barShop ? (
              <nav>
                {staff.role === "BAR" && <Link href="/bar">Bar &amp; Café</Link>}
                {staff.role === "SHOP" && <Link href="/shop">Shop</Link>}
                {staff.role === "SHOP" && <Link href="/orders">Orders</Link>}
                <Link href="/shifts">Staff rota</Link>
              </nav>
            ) : (
              <nav>
                <Link href="/login">Staff sign-in</Link>
              </nav>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
