import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getGoogleRedirectUri, safeNextPath } from "@/lib/auth";

// Starts Google sign-in for staff. Needs GOOGLE_CLIENT_ID and
// GOOGLE_CLIENT_SECRET in the environment.
export async function GET(req: NextRequest) {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!id) return NextResponse.redirect(new URL("/login?error=google", req.url));
  const state = crypto.randomBytes(16).toString("hex");
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set("cc_gstate", state, opts);
  const next = req.nextUrl.searchParams.get("next") ?? "/dashboard";
  jar.set("cc_gnext", safeNextPath(next), opts);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", getGoogleRedirectUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
