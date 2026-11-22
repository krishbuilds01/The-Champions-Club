import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { badRequest, notFound } from "../errors";
import { addDaysISO, todayISO } from "../format";
import type { ExpiringDTO, MemberDTO, MemberHomeDTO, MemberState } from "../types";
import { toBookingDTO } from "./bookings";
import { toOrderDTO, toTabDTO } from "./sales";

type MemberRow = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  expiresOn: Date | null;
  plan: { name: string; code: string } | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  dateOfBirth?: Date | null;
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
    const exp = m.expiresOn ? m.expiresOn.toISOString().slice(0, 10) : "";
    const daysLeft = exp ? Math.round((Date.parse(exp) - Date.parse(today)) / 86400000) : 0;
    return { id: m.id, name: m.name, phone: m.phone, planName: m.plan?.name ?? "No plan", expiresOn: exp, daysLeft };
  });
}

// Membership state is derived from the expiry date, never stored, so it
// can never disagree with the dates.
export const memberState = (expiresOn: Date | null | undefined, onISO: string = todayISO()): MemberState | "none" => {
  if (!expiresOn) return "none";
  const exp = expiresOn.toISOString().slice(0, 10);
  if (exp < onISO) return "expired";
  const soon = new Date(Date.parse(onISO) + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return exp <= soon ? "expiring" : "active";
};

export const toMemberDTO = (m: MemberRow): MemberDTO => ({
  id: m.id,
  name: m.name,
  phone: m.phone,
  email: m.email ?? null,
  plan: m.plan ? m.plan.name : "None",
  planCode: m.plan ? m.plan.code : "none",
  state: (memberState(m.expiresOn) === "none" ? "expired" : memberState(m.expiresOn)) as MemberState,
  expiresOn: m.expiresOn ? m.expiresOn.toISOString().slice(0, 10) : "",
  parentName: m.parentName ?? null,
  parentPhone: m.parentPhone ?? null,
  parentEmail: m.parentEmail ?? null,
  dateOfBirth: m.dateOfBirth ? m.dateOfBirth.toISOString().slice(0, 10) : null,
});

export const findMemberByName = (name: string) =>
  db.member.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    include: { plan: true },
  });

export async function listMembers(q?: string): Promise<MemberDTO[]> {
  const trimmed = q?.trim();
  const rows = await db.member.findMany({
    where: trimmed
      ? {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { email: { contains: trimmed, mode: "insensitive" } },
            { phone: { contains: trimmed } },
          ],
        }
      : undefined,
    include: { plan: true },
    orderBy: { name: "asc" },
  });
  return rows.map(toMemberDTO);
}

export async function createMember(
  input: {
    name: string;
    phone: string;
    email?: string;
    planCode: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    dateOfBirth?: string;
  },
  client: Prisma.TransactionClient | typeof db = db,
): Promise<MemberDTO> {
  const plan = await client.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw badRequest("Pick a plan that exists");

  const email = input.email?.trim().toLowerCase() || null;
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

  if (email || input.phone) {
    const existing = await client.member.findFirst({
      where: {
        OR: [
          ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
          ...(input.phone ? [{ phone: input.phone.trim() }] : []),
        ],
      },
      include: { plan: true },
    });
    if (existing) {
      const passwordHash = existing.passwordHash ?? (input.phone ? await bcrypt.hash(input.phone, 10) : null);
      const updated = await client.member.update({
        where: { id: existing.id },
        data: {
          name: input.name.trim() || existing.name,
          phone: input.phone.trim() || existing.phone,
          email: email || existing.email,
          planId: plan.id,
          joinedOn: joined,
          expiresOn: expires,
          passwordHash,
          parentName: input.parentName?.trim() || existing.parentName,
          parentPhone: input.parentPhone?.trim() || existing.parentPhone,
          parentEmail: input.parentEmail?.trim().toLowerCase() || existing.parentEmail,
          dateOfBirth: dob || existing.dateOfBirth,
        },
        include: { plan: true },
      });
      return toMemberDTO(updated);
    }
  }

  const passwordHash = email
    ? await bcrypt.hash(input.phone.trim() ? input.phone : email, 10)
    : null;
  const row = await client.member.create({
    data: {
      name: input.name,
      phone: input.phone,
      email,
      passwordHash,
      planId: plan.id,
      joinedOn: joined,
      expiresOn: expires,
      parentName: input.parentName?.trim() || null,
      parentPhone: input.parentPhone?.trim() || null,
      parentEmail: input.parentEmail?.trim().toLowerCase() || null,
      dateOfBirth: dob,
    },
    include: { plan: true },
  });
  return toMemberDTO(row);
}

export async function availMembership(input: {
  email: string;
  name?: string;
  phone?: string;
  planCode: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  dateOfBirth?: string;
}): Promise<MemberDTO> {
  const plan = await db.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw badRequest("Pick a valid plan (gold, silver, or junior)");

  const cleanEmail = input.email.trim().toLowerCase();
  const joined = new Date(`${todayISO()}T00:00:00.000Z`);
  const expires = new Date(joined.getTime() + plan.termDays * 24 * 60 * 60 * 1000);
  const dob = input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null;

  let member = await db.member.findFirst({
    where: {
      OR: [
        { email: { equals: cleanEmail, mode: "insensitive" } },
        ...(input.phone ? [{ phone: input.phone.trim() }] : []),
      ],
    },
    include: { plan: true },
  });

  if (member) {
    const cleanPhone = input.phone?.trim() || member.phone;
    const cleanName = input.name?.trim() || member.name;
    const passwordHash = member.passwordHash ?? (await bcrypt.hash(cleanPhone || "demo1234", 10));
    const updated = await db.member.update({
      where: { id: member.id },
      data: {
        planId: plan.id,
        joinedOn: joined,
        expiresOn: expires,
        email: cleanEmail,
        name: cleanName,
        phone: cleanPhone,
        passwordHash,
        parentName: input.parentName?.trim() || member.parentName,
        parentPhone: input.parentPhone?.trim() || member.parentPhone,
        parentEmail: input.parentEmail?.trim().toLowerCase() || member.parentEmail,
        dateOfBirth: dob || member.dateOfBirth,
      },
      include: { plan: true },
    });
    return toMemberDTO(updated);
  } else {
    const cleanPhone = input.phone?.trim() || `9811${Math.floor(100000 + Math.random() * 900000)}`;
    const cleanName = input.name?.trim() || cleanEmail.split("@")[0];
    const passwordHash = await bcrypt.hash(cleanPhone, 10);
    const created = await db.member.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash,
        planId: plan.id,
        joinedOn: joined,
        expiresOn: expires,
        parentName: input.parentName?.trim() || null,
        parentPhone: input.parentPhone?.trim() || null,
        parentEmail: input.parentEmail?.trim().toLowerCase() || null,
        dateOfBirth: dob,
      },
      include: { plan: true },
    });
    return toMemberDTO(created);
  }
}

// Renew a plan: the new term starts at the later of today and the
// current expiry, so renewing early never loses days. The renewal is
// recorded in MembershipRenewal in the same transaction as the new
// expiry, so the paper trail and the member record cannot disagree.
export async function renewMember(
  id: number,
  payMethod: "CASH" | "CARD" | "UPI" | "ONLINE" = "CASH",
): Promise<MemberDTO> {
  const member = await db.member.findUnique({ where: { id }, include: { plan: true } });
  if (!member) throw notFound("No such member");
  if (!member.plan || !member.planId) throw badRequest("Member does not have an active plan to renew");
  const today = todayISO();
  const currentExp = member.expiresOn ? member.expiresOn.toISOString().slice(0, 10) : today;
  const from = currentExp > today ? currentExp : today;
  const to = addDaysISO(from, member.plan.termDays);
  const amount = member.plan.tennisPrice;
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.member.update({
      where: { id },
      data: { expiresOn: new Date(`${to}T00:00:00.000Z`) },
      include: { plan: true },
    });
    await tx.membershipRenewal.create({
      data: {
        memberId: id,
        planId: member.planId!,
        amount,
        payMethod,
        renewedFrom: new Date(`${from}T00:00:00.000Z`),
        renewedTo: new Date(`${to}T00:00:00.000Z`),
      },
    });
    return row;
  });
  return toMemberDTO(updated);
}

export async function getMember(id: number): Promise<MemberDTO> {
  const row = await db.member.findUnique({ where: { id }, include: { plan: true } });
  if (!row) throw notFound("No such member");
  return toMemberDTO(row);
}

export async function buyPlanForMember(memberId: number, planCode: string): Promise<MemberDTO> {
  const plan = await db.plan.findUnique({ where: { code: planCode } });
  if (!plan) throw badRequest("Pick a plan that exists");
  const joined = new Date(`${todayISO()}T00:00:00.000Z`);
  const expires = new Date(joined.getTime() + plan.termDays * 24 * 60 * 60 * 1000);
  const updated = await db.member.update({
    where: { id: memberId },
    data: { planId: plan.id, joinedOn: joined, expiresOn: expires },
    include: { plan: true },
  });
  return toMemberDTO(updated);
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
