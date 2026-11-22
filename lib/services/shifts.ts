import { db } from "../db";
import { todayISO } from "../format";
import { badRequest, conflict, notFound } from "../errors";
import type { ShiftDTO, StaffRosterDTO } from "../types";

// The rota, kept basic: a person, a day, a part of the day.
// Morning and evening are the club's two halves.

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

export async function listStaff(): Promise<StaffRosterDTO[]> {
  const rows = await db.staff.findMany({ orderBy: { name: "asc" } });
  return rows.map((s) => ({ id: s.id, name: s.name, role: s.role }));
}

export async function listShifts(fromISO: string, toISO: string): Promise<ShiftDTO[]> {
  const rows = await db.shift.findMany({
    where: { date: { gte: day(fromISO), lte: day(toISO) } },
    include: { staff: true },
    // MORNING before EVENING: alphabetically EVENING < MORNING, so
    // part sorts descending. (part is a plain String; the DTO below
    // still coerces anything that is not EVENING to MORNING.)
    orderBy: [{ date: "asc" }, { part: "desc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    staffId: r.staffId,
    staffName: r.staff.name,
    role: r.staff.role,
    date: r.date.toISOString().slice(0, 10),
    part: r.part === "EVENING" ? "EVENING" : "MORNING",
  }));
}

export async function assignShift(input: { staffId: number; date: string; part: "MORNING" | "EVENING" }): Promise<ShiftDTO> {
  const staff = await db.staff.findUnique({ where: { id: input.staffId } });
  if (!staff) throw badRequest("Pick a staff member who exists");
  if (input.date < todayISO()) throw badRequest("Cannot assign a shift in the past");
  try {
    // Check-then-create inside one transaction, so two simultaneous
    // assigns cannot both pass the check and create a double shift.
    const r = await db.$transaction(async (tx) => {
      const existing = await tx.shift.findFirst({
        where: { staffId: input.staffId, date: day(input.date), part: input.part },
      });
      if (existing) throw conflict(`${staff.name} is already on that ${input.part.toLowerCase()} shift`);
      return tx.shift.create({
        data: { staffId: input.staffId, date: day(input.date), part: input.part },
        include: { staff: true },
      });
    });
    return {
      id: r.id, staffId: r.staffId, staffName: r.staff.name, role: r.staff.role,
      date: input.date, part: input.part,
    };
  } catch (e) {
    // The @@unique([staffId, date, part]) guard: a race that slips past
    // the check is a conflict (409), not a 500.
    if ((e as { code?: string })?.code === "P2002") throw conflict(`${staff.name} is already on that ${input.part.toLowerCase()} shift`);
    throw e;
  }
}

export async function removeShift(id: number): Promise<{ ok: true }> {
  const row = await db.shift.findUnique({ where: { id } });
  if (!row) throw notFound("No such shift");
  await db.shift.delete({ where: { id } });
  return { ok: true };
}
