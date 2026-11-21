import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { forbidden, unauthorized } from "./errors";
import type { StaffDTO } from "./types";

// Staff sign-in for the web today, the same token works as a Bearer token
// for a future mobile app. Members have their own separate portal login
// below (cc_member cookie, kind:"member" tokens); the two never mix —
// a member token is rejected here and a staff token opens no portal page.
const COOKIE = "cc_session";
// No fallback: a missing AUTH_SECRET must fail loudly instead of
// signing every token with a secret anyone can guess. Read lazily so
// a missing secret breaks sign-in attempts, not the build.
function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set — staff and member sign-in cannot work without it");
  return new TextEncoder().encode(s);
}

export const toStaffDTO = (s: { id: number; name: string; email: string; role: StaffDTO["role"] }): StaffDTO => ({
  id: s.id,
  name: s.name,
  email: s.email,
  role: s.role,
});

async function signToken(staff: StaffDTO): Promise<string> {
  return new SignJWT({ name: staff.name, role: staff.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(staff.id))
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<StaffDTO | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind === "member") return null; // portal tokens are not staff tokens
    const staff = await db.staff.findUnique({ where: { id: Number(payload.sub) } });
    return staff ? toStaffDTO(staff) : null;
  } catch {
    return null;
  }
}

export async function tokenForStaff(s: { id: number; name: string; email: string; role: StaffDTO["role"] }): Promise<string> {
  return signToken(toStaffDTO(s));
}

export async function login(email: string, password: string): Promise<{ staff: StaffDTO; token: string }> {
  const staff = await db.staff.findUnique({ where: { email: email.toLowerCase() } });
  if (!staff || !(await bcrypt.compare(password, staff.passwordHash)))
    throw unauthorized("Email or password does not match");
  const dto = toStaffDTO(staff);
  return { staff: dto, token: await signToken(dto) };
}


export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// For route handlers: accepts the session cookie or an Authorization
// Bearer token, so the same guard serves web and mobile clients.
export async function requireStaff(req: Request): Promise<StaffDTO> {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (bearer) {
    const staff = await verifyToken(bearer);
    if (staff) return staff;
  }
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const staff = await verifyToken(token);
    if (staff) return staff;
  }
  throw unauthorized();
}

// Staff sign-in plus a role check, for routes only some roles may use:
// the dashboard is the owner's, the bar till is bar staff's, and so on.
export async function requireRole(req: Request, ...roles: StaffDTO["role"][]): Promise<StaffDTO> {
  const staff = await requireStaff(req);
  if (!roles.includes(staff.role)) throw forbidden("Your role cannot do this");
  return staff;
}

export async function currentStaff(): Promise<StaffDTO | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

// ---------- Member portal session ----------
// Members sign in with the email the front desk put on their record;
// the first password is their phone number. The session lives in its
// own cookie and every token carries kind:"member".
const MEMBER_COOKIE = "cc_member";

export type MemberSession = { id: number; name: string; email: string };

async function signMemberToken(m: MemberSession): Promise<string> {
  return new SignJWT({ kind: "member", name: m.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(m.id))
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifyMemberToken(token: string): Promise<MemberSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== "member") return null;
    const member = await db.member.findUnique({ where: { id: Number(payload.sub) } });
    return member?.email ? { id: member.id, name: member.name, email: member.email } : null;
  } catch {
    return null;
  }
}

export async function memberLogin(email: string, password: string): Promise<{ member: MemberSession; token: string }> {
  const member = await db.member.findUnique({ where: { email: email.toLowerCase() } });
  if (!member?.passwordHash || !(await bcrypt.compare(password, member.passwordHash)))
    throw unauthorized("Email or password does not match");
  const session: MemberSession = { id: member.id, name: member.name, email: member.email! };
  return { member: session, token: await signMemberToken(session) };
}

export async function setMemberCookie(token: string) {
  const jar = await cookies();
  jar.set(MEMBER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

export async function clearMemberCookie() {
  const jar = await cookies();
  jar.delete(MEMBER_COOKIE);
}

export async function requireMember(req: Request): Promise<MemberSession> {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (bearer) {
    const member = await verifyMemberToken(bearer);
    if (member) return member;
  }
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value;
  if (token) {
    const member = await verifyMemberToken(token);
    if (member) return member;
  }
  throw unauthorized();
}

export async function currentMember(): Promise<MemberSession | null> {
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value;
  return token ? verifyMemberToken(token) : null;
}

// A post-login redirect must stay on this site: a path starting with "/"
// but never "//" (protocol-relative, resolves to another host), never
// containing "://" or a backslash. Anything else falls back to /dashboard.
export const safeNextPath = (next: string | null | undefined): string => {
  if (!next) return "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://") || next.includes("\\"))
    return "/dashboard";
  return next;
};

export const GOOGLE_REDIRECT_URI = "https://the-champions-club.vercel.app/api/v1/auth/google/callback";

export function getGoogleRedirectUri(req?: { headers: { get: (name: string) => string | null }; nextUrl?: { host?: string; protocol?: string } }): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI.trim();
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.nextUrl?.host;
    if (host && (host.startsWith("localhost") || host.startsWith("127.0.0.1"))) {
      const proto = req.headers.get("x-forwarded-proto") || (req.nextUrl?.protocol ? req.nextUrl.protocol.replace(":", "") : "http");
      return `${proto}://${host}/api/v1/auth/google/callback`;
    }
  }
  return GOOGLE_REDIRECT_URI;
}

