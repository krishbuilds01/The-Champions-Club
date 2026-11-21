import bcrypt from "bcryptjs";
import { db } from "../db";
import { badRequest, notFound } from "../errors";
import { todayISO } from "../format";
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
  const rows = await db.member.findMany({ include: { plan: true }, orderBy: { expiresOn: "asc" } });
  const today = todayISO();
  const out: ExpiringDTO[] = [];
  for (const m of rows) {
    const exp = m.expiresOn.toISOString().slice(0, 10);
    const daysLeft = Math.round((Date.parse(exp) - Date.parse(today)) / 86400000);
    if (daysLeft >= 0 && daysLeft <= withinDays)
      out.push({ id: m.id, name: m.name, phone: m.phone, planName: m.plan.name, expiresOn: exp, daysLeft });
  }
  return out;
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

export async function createMember(input: { name: string; phone: string; email?: string; planCode: string }): Promise<MemberDTO> {
  const plan = await db.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw badRequest("Pick a plan that exists");
  const joined = new Date(`${todayISO()}T00:00:00.000Z`);
  const expires = new Date(joined.getTime() + plan.termDays * 24 * 60 * 60 * 1000);
  // Portal access: with an email on file the member can sign in; the
  // first password is their phone number, the desk tells them to
  // change it later (no self-service reset in this version).
  const email = input.email?.trim().toLowerCase() || null;
  const passwordHash = email && input.phone ? await bcrypt.hash(input.phone, 10) : null;
  const row = await db.member.create({
    data: { name: input.name, phone: input.phone, email, passwordHash, planId: plan.id, joinedOn: joined, expiresOn: expires },
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
