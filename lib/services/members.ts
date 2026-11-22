import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { badRequest, conflict, notFound } from "../errors";
import { addDaysISO, todayISO } from "../format";
import type { ExpiringDTO, MemberDTO, MemberHomeDTO, MemberState } from "../types";
import { toBookingDTO } from "./bookings";
import { toOrderDTO, toTabDTO } from "./sales";

type MemberRow = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  expiresOn: Date;
  plan: { name: string; code: string };
};

// The front desk's renewal chase list: plans ending within the next
// `withinDays` days (14 by default), soonest first, with days left.
export async function expiringMembers(withinDays = 14): Promise<ExpiringDTO[]> {
  // The date window is a DB filter, not a scan of every member in
  // memory: expiry from today up to today + withinDays.
  const today = todayISO();
  const rows = await db.member.findMany({
    where: {
      expiresOn: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${addDaysISO(today, withinDays + 1)}T00:00:00.000Z`),
      },
    },
    include: { plan: true },
    orderBy: { expiresOn: "asc" },
  });
  return rows.map((m) => {
    const exp = m.expiresOn.toISOString().slice(0, 10);
    const daysLeft = Math.round((Date.parse(exp) - Date.parse(today)) / 86400000);
    return { id: m.id, name: m.name, phone: m.phone, planName: m.plan.name, expiresOn: exp, daysLeft };
  });
}

// Membership state is derived from the expiry date, never stored, so it
// can never disagree with the dates.
export const memberState = (expiresOn: Date, onISO: string = todayISO()): MemberState => {
  const exp = expiresOn.toISOString().slice(0, 10);
  if (exp < onISO) return "expired";
  const soon = new Date(Date.parse(onISO) + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return exp <= soon ? "expiring" : "active";
};

export const toMemberDTO = (m: MemberRow): MemberDTO => ({
  id: m.id,
  name: m.name,
  phone: m.phone,
  email: m.email,
  plan: m.plan.name,
  planCode: m.plan.code,
  state: memberState(m.expiresOn),
  expiresOn: m.expiresOn.toISOString().slice(0, 10),
});

export const findMemberByName = (name: string) =>
  db.member.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    include: { plan: true },
  });

export async function listMembers(q?: string): Promise<MemberDTO[]> {
  const rows = await db.member.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    include: { plan: true },
    orderBy: { name: "asc" },
  });
  return rows.map(toMemberDTO);
}

export async function createMember(
  input: { name: string; phone: string; email?: string; planCode: string; dateOfBirth?: string },
  // Lets a caller run the creation inside its own transaction
  // (enquiry conversion), so member + enquiry update are atomic.
  client: Prisma.TransactionClient | typeof db = db,
): Promise<MemberDTO> {
  const plan = await client.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw badRequest("Pick a plan that exists");
  // No duplicate members: the same email, or the same name with the
  // same phone, is the same person, not a second record.
  const email = input.email?.trim().toLowerCase() || null;
  if (email) {
    const sameEmail = await db.member.findUnique({ where: { email } });
    if (sameEmail) throw conflict("A member with that email already exists");
  }
  const samePerson = await db.member.findFirst({
    where: { name: { equals: input.name.trim(), mode: "insensitive" }, phone: input.phone.trim() },
  });
  if (samePerson) throw conflict("A member with that name and phone already exists");
  // Junior is under-18 only: the desk page checks this too, but the
  // server is the one that has to mean it, and the DOB is stored.
  const dob = input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null;
  if (input.planCode === "junior") {
    if (!dob) throw badRequest("Junior is for under-18s — a date of birth is required");
    const joinedMs = Date.parse(todayISO());
    let age = new Date(joinedMs).getUTCFullYear() - dob.getUTCFullYear();
    const mth = new Date(joinedMs).getUTCMonth() - dob.getUTCMonth();
    if (mth < 0 || (mth === 0 && new Date(joinedMs).getUTCDate() < dob.getUTCDate())) age -= 1;
    if (age >= 18) throw badRequest("Junior is for under-18s — this member is 18 or older");
  }
  const joined = new Date(`${todayISO()}T00:00:00.000Z`);
  const expires = new Date(joined.getTime() + plan.termDays * 24 * 60 * 60 * 1000);
  // Portal access: with an email on file the member can sign in; the
  // first password is their phone number, or the email itself when
  // there is no phone — never a null hash, or the member could never
  // sign in at all. The desk tells them to change it later
  // (no self-service reset in this version).
  const passwordHash = email
    ? await bcrypt.hash(input.phone.trim() ? input.phone : email, 10)
    : null;
  const row = await client.member.create({
    data: { name: input.name, phone: input.phone, email, passwordHash, planId: plan.id, joinedOn: joined, expiresOn: expires, dateOfBirth: dob },
    include: { plan: true },
  });
  return toMemberDTO(row);
}

export async function getMember(id: number): Promise<MemberDTO> {
  const row = await db.member.findUnique({ where: { id }, include: { plan: true } });
  if (!row) throw notFound("No such member");
  return toMemberDTO(row);
}

// Everything the portal home shows: the member's plan, bookings,
// shop orders and bar tabs, all read off their member record.
export async function memberHome(id: number): Promise<MemberHomeDTO> {
  const row = await db.member.findUnique({ where: { id }, include: { plan: true } });
  if (!row) throw notFound("No such member");
  const [bookings, orders, tabs] = await Promise.all([
    db.booking.findMany({
      where: { memberId: id },
      include: { court: true },
      orderBy: [{ date: "desc" }, { start: "asc" }],
      take: 20,
    }),
    db.order.findMany({
      where: { memberId: id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.tab.findMany({
      where: { memberId: id },
      include: { items: { include: { product: true } } },
      orderBy: { id: "desc" },
      take: 10,
    }),
  ]);
  return {
    member: toMemberDTO(row),
    bookings: bookings.map(toBookingDTO),
    orders: orders.map(toOrderDTO),
    tabs: tabs.map((t) => toTabDTO(t as Parameters<typeof toTabDTO>[0])),
  };
}
