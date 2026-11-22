import { db } from "../db";
import { isISODate } from "../format";
import { badRequest, conflict, notFound } from "../errors";
import type { LeaveDTO } from "../types";

// Leave: a staff member's time off. Approved leave is the source of
// truth for Payroll.leaveDays; only one live request may cover a day,
// so overlapping requests are refused up front.

type LeaveRow = {
  id: number;
  staffId: number;
  fromDate: Date;
  toDate: Date;
  type: string;
  reason: string | null;
  status: string;
  decidedBy: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  staff: { name: string; role: string };
};

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const toLeaveDTO = (l: LeaveRow): LeaveDTO => ({
  id: l.id,
  staffId: l.staffId,
  staffName: l.staff.name,
  role: l.staff.role,
  fromDate: iso(l.fromDate),
  toDate: iso(l.toDate),
  type: l.type as LeaveDTO["type"],
  reason: l.reason ?? "",
  status: l.status as LeaveDTO["status"],
  decidedBy: l.decidedBy,
  decidedAt: l.decidedAt ? l.decidedAt.toISOString() : null,
  createdAt: iso(l.createdAt),
});

export async function listLeaves(staffId?: number): Promise<LeaveDTO[]> {
  const rows = await db.leave.findMany({
    where: staffId ? { staffId } : undefined,
    include: { staff: true },
    orderBy: [{ fromDate: "asc" }],
  });
  return rows.map((r) => toLeaveDTO(r as LeaveRow));
}

export async function requestLeave(input: {
  staffId: number;
  from: string;
  to: string;
  type: "ANNUAL" | "SICK" | "UNPAID" | "OTHER";
  reason?: string;
}): Promise<LeaveDTO> {
  const staff = await db.staff.findUnique({ where: { id: input.staffId } });
  if (!staff) throw badRequest("Pick a staff member who exists");
  // The service never trusts its caller: dates are checked here too,
  // not only in the route's zod schema.
  if (!isISODate(input.from) || !isISODate(input.to))
    throw badRequest("Leave dates must be real YYYY-MM-DD dates");
  if (input.to < input.from) throw badRequest("The leave cannot end before it starts");
  const overlap = await db.leave.findFirst({
    where: {
      staffId: input.staffId,
      status: { in: ["PENDING", "APPROVED"] },
      fromDate: { lte: day(input.to) },
      toDate: { gte: day(input.from) },
    },
  });
  if (overlap)
    throw conflict(
      `${staff.name} already has ${overlap.status === "APPROVED" ? "approved" : "pending"} leave overlapping those dates`,
    );
  const row = await db.leave.create({
    data: {
      staffId: input.staffId,
      fromDate: day(input.from),
      toDate: day(input.to),
      type: input.type,
      reason: input.reason?.trim() || null,
    },
    include: { staff: true },
  });
  return toLeaveDTO(row as LeaveRow);
}

// Atomic: only a PENDING request flips, so two owners deciding at once
// cannot approve it twice.
export async function decideLeave(id: number, status: "APPROVED" | "REJECTED", decidedBy: string): Promise<LeaveDTO> {
  const updated = await db.leave.updateMany({
    where: { id, status: "PENDING" },
    data: { status, decidedBy, decidedAt: new Date() },
  });
  if (updated.count === 0) {
    const exists = await db.leave.findUnique({ where: { id } });
    if (!exists) throw notFound("No such leave request");
    throw conflict("That leave request has already been decided");
  }
  const row = await db.leave.findUnique({ where: { id }, include: { staff: true } });
  return toLeaveDTO(row as LeaveRow);
}
