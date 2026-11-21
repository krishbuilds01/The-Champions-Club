import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Staff pages sit behind staff sign-in, the member portal behind
// member sign-in. This checks the session token's signature, expiry
// and kind at the edge; API handlers re-check against the database
// on every call.
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-only-secret-change-me");
const STAFF_PAGES = ["/dashboard", "/bookings", "/members", "/bar", "/enquiries", "/invoices", "/expenses", "/payroll", "/shifts"];

async function kindOf(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.kind === "string" ? payload.kind : "staff";
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Member portal: everything under /member except its sign-in page.
  if (pathname === "/member" || (pathname.startsWith("/member/") && pathname !== "/member/login")) {
    if ((await kindOf(req.cookies.get("cc_member")?.value)) === "member")
      return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/member/login";
    return NextResponse.redirect(url);
  }

  if (!STAFF_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return NextResponse.next();
  const kind = await kindOf(req.cookies.get("cc_session")?.value);
  if (kind && kind !== "member") return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/dashboard/:path*", "/bookings/:path*", "/members/:path*", "/bar/:path*", "/enquiries/:path*", "/invoices/:path*", "/expenses/:path*", "/payroll/:path*", "/shifts/:path*", "/member", "/member/:path*"] };
