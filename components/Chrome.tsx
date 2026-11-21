"use client";

// The landing page carries its own header and footer (the Figma Make
// design); every other page gets the club nav and footer.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Nav from "./Nav";
import { api } from "@/lib/api";
import type { StaffDTO } from "@/lib/types";

export default function Chrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [staff, setStaff] = useState<StaffDTO | null>(null);

  useEffect(() => {
    api.me()
      .then((r) => setStaff(r.staff))
      .catch(() => setStaff(null));
  }, [path]);

  if (path === "/") return <>{children}</>;

  // The footer's staff column only lists pages the signed-in role can
  // actually open; visitors do not see it at all.
  const desk = staff && (staff.role === "OWNER" || staff.role === "FRONT_DESK" || staff.role === "STAFF");
  return (
    <div className="shell">
      <Nav />
      {children}
      {path !== "/login" && (
      <footer className="footer">
        <div className="wrap footer-in">
          <div>
            <p className="footer-brand">The Champions Club</p>
            <p className="muted">Courts open 6 AM to 10 PM, every day.<br />Front desk: +91 98765 43210</p>
          </div>
          <nav>
            <Link href="/courts">Courts</Link>
            <Link href="/trial">Free trial</Link>
            <Link href="/#membership">Membership</Link>
          </nav>
          <nav>
            <Link href="/shop">Shop</Link>
            <Link href="/bar">Bar &amp; Café</Link>
          </nav>
          {desk ? (
            <nav>
              {staff.role === "OWNER" && <Link href="/dashboard">Dashboard</Link>}
              <Link href="/bookings">Bookings</Link>
              <Link href="/members">Members</Link>
              <Link href="/enquiries">Enquiries</Link>
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
