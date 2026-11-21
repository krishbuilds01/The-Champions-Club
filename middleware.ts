import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Staff pages sit behind sign-in. This checks the session token's
// signature and expiry at the edge; API handlers re-check against the
// database on every call.
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-only-secret-change-me");
const STAFF_PAGES = ["/dashboard", "/bookings", "/members", "/bar", "/enquiries"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!STAFF_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return NextResponse.next();
  const token = req.cookies.get("cc_session")?.value;
  if (token) {
    try {
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      // fall through to the redirect
    }
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/dashboard/:path*", "/bookings/:path*", "/members/:path*", "/bar/:path*", "/enquiries/:path*"] };
