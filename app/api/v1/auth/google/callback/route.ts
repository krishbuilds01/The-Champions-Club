import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { setSessionCookie, tokenForStaff } from "@/lib/auth";

// Google sends the browser back here. Only Google accounts whose email
// belongs to a staff record get a session; everyone else is turned away.
export async function GET(req: NextRequest) {
  const back = (path: string) => NextResponse.redirect(new URL(path, req.url));
  const jar = await cookies();
  const state = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  if (!code || !state || jar.get("cc_gstate")?.value !== state) return back("/login?error=gstate");
  jar.delete("cc_gstate");
  const next = jar.get("cc_gnext")?.value ?? "/dashboard";
  jar.delete("cc_gnext");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${req.nextUrl.origin}/api/v1/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => "");
    console.error("google token exchange failed", tokenRes.status, detail.slice(0, 300));
    return back("/login?error=gtoken");
  }
  const { access_token } = await tokenRes.json();

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) return back("/login?error=ginfo");
  const info = await infoRes.json();
  if (!info.email || info.email_verified === false) return back("/login?error=gemail");

  const staff = await db.staff.findUnique({ where: { email: String(info.email).toLowerCase() } });
  if (!staff) return back("/login?error=notstaff");
  await setSessionCookie(await tokenForStaff(staff));
  return back(next);
}
