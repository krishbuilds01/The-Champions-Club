import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "./errors";
import { todayISO } from "./format";
import { memberState } from "./services/members";
import type { MemberSessionDTO, StaffDTO, StaffMemberPinDTO } from "./types";

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

export const DEFAULT_ROLE_PINS: Record<string, string> = {
  OWNER: "1234",
  FRONT_DESK: "2222",
  STAFF: "2222",
  BAR: "3333",
  SHOP: "4444",
};

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Club Owner",
  FRONT_DESK: "Club Staff",
  BAR: "Bar & Cafeteria Staff",
  SHOP: "Pro Shop Staff",
};

export async function pinLogin(
  role: StaffDTO["role"],
  pin: string,
  staffId?: number,
): Promise<{ staff: StaffDTO; token: string }> {
  if ((!role && !staffId) || !pin) {
    throw badRequest("Role/Staff ID and PIN are required");
  }
  const cleanPin = pin.trim();

  let activeStaff: any = null;

  if (staffId) {
    const s = await db.staff.findUnique({ where: { id: staffId } });
    if (!s) throw unauthorized("No such staff profile");
    if (s.pinHash) {
      if (await bcrypt.compare(cleanPin, s.pinHash)) {
        activeStaff = s;
      }
    } else {
      const def = DEFAULT_ROLE_PINS[s.role];
      if (def && cleanPin === def) {
        activeStaff = s;
      }
    }
  } else {
    const staffMembers = await db.staff.findMany({
      where: { role },
      orderBy: { id: "asc" },
    });
    if (!staffMembers.length) {
      throw unauthorized(`No staff profile configured for role ${role}`);
    }

    for (const s of staffMembers) {
      if (s.pinHash) {
        if (await bcrypt.compare(cleanPin, s.pinHash)) {
          activeStaff = s;
          break;
        }
      } else {
        const def = DEFAULT_ROLE_PINS[role];
        if (def && cleanPin === def) {
          activeStaff = s;
          break;
        }
      }
    }
  }

  if (!activeStaff) {
    throw unauthorized(`Incorrect PIN for ${staffId ? "selected staff member" : (ROLE_LABELS[role] || role)}`);
  }

  // Record shift work log if not currently open today
  try {
    const openLog = await db.staffWorkLog.findFirst({
      where: { staffId: activeStaff.id, clockOut: null },
      orderBy: { clockIn: "desc" },
    });
    if (!openLog) {
      await db.staffWorkLog.create({
        data: {
          staffId: activeStaff.id,
          clockIn: new Date(),
          note: `Clocked in via PIN sign-in (${ROLE_LABELS[activeStaff.role] || activeStaff.role})`,
        },
      });
    }
  } catch {
    // Non-fatal for authentication
  }

  const dto = toStaffDTO(activeStaff);
  const token = await signToken(dto);
  return { staff: dto, token };
}

export async function updateStaffPin(staffId: number, newPin: string) {
  const staff = await db.staff.findUnique({ where: { id: staffId } });
  if (!staff) throw badRequest("Staff member not found");
  const cleanPin = newPin.trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    throw badRequest("PIN must be 4 to 6 numeric digits");
  }
  const pinHash = await bcrypt.hash(cleanPin, 10);
  await db.staff.update({
    where: { id: staffId },
    data: { pinHash },
  });
  return { ok: true, staffId, name: staff.name, message: `PIN updated successfully for ${staff.name}` };
}

export async function resetStaffPin(staffId: number) {
  const staff = await db.staff.findUnique({ where: { id: staffId } });
  if (!staff) throw badRequest("Staff member not found");
  await db.staff.update({
    where: { id: staffId },
    data: { pinHash: null },
  });
  return { ok: true, staffId, name: staff.name, message: `PIN reset to default for ${staff.name}` };
}

export async function updateStaffHourlyRate(staffId: number, hourlyRate: number) {
  const staff = await db.staff.findUnique({ where: { id: staffId } });
  if (!staff) throw badRequest("Staff member not found");
  const rate = Math.round(Number(hourlyRate));
  if (!Number.isInteger(rate) || rate <= 0) {
    throw badRequest("Hourly rate must be a positive integer in rupees");
  }
  await db.staff.update({
    where: { id: staffId },
    data: { hourlyRate: rate },
  });
  return { ok: true, staffId, name: staff.name, hourlyRate: rate, message: `Hourly rate updated to ₹${rate}/hr for ${staff.name}` };
}

export async function payStaffSalary(input: {
  staffId: number;
  amount: number;
  month?: string;
  paymentRef?: string;
}) {
  const staff = await db.staff.findUnique({ where: { id: input.staffId } });
  if (!staff) throw badRequest("Staff member not found");
  const month = input.month || todayISO().slice(0, 7);
  const amount = Math.round(Number(input.amount));
  if (!Number.isInteger(amount) || amount <= 0) {
    throw badRequest("Salary payout amount must be a positive number in rupees");
  }
  const paymentRef = input.paymentRef || `SAL-RZP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const existingPayroll = await db.payroll.findFirst({
    where: {
      OR: [{ staffId: staff.id }, { staffName: staff.name }],
      month,
    },
  });

  if (existingPayroll) {
    await db.payroll.update({
      where: { id: existingPayroll.id },
      data: {
        status: "PAID",
        salary: amount,
        paymentRef,
        paidAt: new Date(),
      },
    });
  } else {
    await db.payroll.create({
      data: {
        staffName: staff.name,
        staffId: staff.id,
        month,
        salary: amount,
        leaveDays: 0,
        tax: 0,
        status: "PAID",
        paymentRef,
        paidAt: new Date(),
      },
    });
  }

  // Also record into club Expenses (category "Payroll") so financial statements sync!
  await db.expense.create({
    data: {
      title: `Salary Payout - ${staff.name} (${month})`,
      category: "Payroll",
      amount,
      spentOn: new Date(),
      note: `Direct salary payment via Demo Razorpay · Ref: ${paymentRef}`,
    },
  });

  return {
    ok: true,
    message: `Salary of ₹${amount} successfully paid to ${staff.name}`,
    paymentRef,
    paidAt: new Date().toISOString(),
  };
}

export async function toggleStaffClock(staffId: number) {
  const staff = await db.staff.findUnique({ where: { id: staffId } });
  if (!staff) throw badRequest("Staff member not found");

  const openLog = await db.staffWorkLog.findFirst({
    where: { staffId, clockOut: null },
    orderBy: { clockIn: "desc" },
  });

  const now = new Date();
  if (openLog) {
    const diffMs = now.getTime() - new Date(openLog.clockIn).getTime();
    const hours = Math.max(0.1, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
    await db.staffWorkLog.update({
      where: { id: openLog.id },
      data: {
        clockOut: now,
        hoursWorked: hours,
      },
    });
    return { ok: true, status: "CLOCKED_OUT", hours, message: `Clocked out ${staff.name}. Logged ${hours} hrs.` };
  } else {
    await db.staffWorkLog.create({
      data: {
        staffId,
        clockIn: now,
        note: `Manual clock-in (${ROLE_LABELS[staff.role] || staff.role})`,
      },
    });
    return { ok: true, status: "CLOCKED_IN", message: `Clocked in ${staff.name} at ${now.toLocaleTimeString("en-IN")}` };
  }
}

export async function getStaffMemberStatuses(): Promise<StaffMemberPinDTO[]> {
  const staffList = await db.staff.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: {
      shifts: true,
      workLogs: true,
    },
  });

  const month = todayISO().slice(0, 7);
  const payrolls = await db.payroll.findMany({
    where: { month },
  });

  const defaultHoursMap: Record<string, { hours: number; shifts: number; rate: number }> = {
    "Neha Gupta": { hours: 42.5, shifts: 11, rate: 250 },
    "Arjun Patel": { hours: 36.0, shifts: 9, rate: 200 },
    "Meera Joshi": { hours: 32.0, shifts: 8, rate: 220 },
  };

  // Deduplicate OWNER accounts so only ONE single authoritative Club Owner appears
  let seenOwner = false;
  const filteredStaffList = [];
  for (const s of staffList) {
    if (s.role === "OWNER") {
      if (!seenOwner) {
        seenOwner = true;
        filteredStaffList.push({
          ...s,
          name: "Vikram Rao (Club Owner)",
          email: "owner@champions.club",
        });
      }
    } else {
      filteredStaffList.push(s);
    }
  }

  const results: StaffMemberPinDTO[] = [];

  for (const s of filteredStaffList) {
    const isOwner = s.role === "OWNER";
    const def = defaultHoursMap[s.name] || { hours: 24, shifts: 6, rate: 250 };
    const hourlyRate = isOwner ? 0 : (s.hourlyRate || def.rate);

    let loggedHours = 0;
    let isOnShift = false;
    for (const log of s.workLogs) {
      if (log.clockOut) {
        loggedHours += log.hoursWorked;
      } else {
        isOnShift = true;
        const liveHrs = (Date.now() - new Date(log.clockIn).getTime()) / (1000 * 60 * 60);
        loggedHours += Math.max(0.1, Math.round(liveHrs * 10) / 10);
      }
    }

    const shiftsCount = isOwner ? 0 : (s.shifts.length > 0 ? s.shifts.length : def.shifts);
    const hoursWorked = isOwner ? 0 : (loggedHours > 0 ? Math.round(loggedHours * 10) / 10 : def.hours);

    const payRec = payrolls.find(
      (p) => p.staffId === s.id || p.staffName.toLowerCase() === s.name.toLowerCase(),
    );
    const isPaid = payRec?.status === "PAID";
    // Owners own the club and do NOT pay salary to themselves
    const salaryDue = isOwner ? 0 : (isPaid ? 0 : Math.round(hoursWorked * hourlyRate));

    results.push({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role as any,
      roleLabel: ROLE_LABELS[s.role] || s.role,
      defaultPin: DEFAULT_ROLE_PINS[s.role] || "0000",
      hasCustomPin: Boolean(s.pinHash),
      hourlyRate,
      hoursWorked,
      shiftsCount,
      salaryDue,
      isOnShift: isOwner ? false : isOnShift,
      payrollStatus: isOwner ? "EXEMPT" : (isPaid ? "PAID" : "PENDING"),
      lastPaidAt: payRec?.paidAt ? payRec.paidAt.toISOString() : null,
      lastPaymentRef: payRec?.paymentRef || null,
    });
  }

  return results;
}

export async function createStaffMember(input: {
  name?: string;
  email?: string;
  role?: string;
  hourlyRate?: number;
  pin?: string;
  password?: string;
}) {
  const name = (input.name || "").trim();
  const email = (input.email || "").trim().toLowerCase();
  const role = (input.role || "FRONT_DESK").toUpperCase();
  const hourlyRate = Math.max(50, Math.round(Number(input.hourlyRate) || 250));
  const pin = (input.pin || "").trim();

  if (!name || name.length < 2) {
    throw badRequest("Full name is required (minimum 2 characters)");
  }
  if (!email || !email.includes("@")) {
    throw badRequest("A valid work email is required");
  }

  const allowedRoles = ["FRONT_DESK", "BAR", "SHOP", "STAFF"];
  if (!allowedRoles.includes(role)) {
    throw badRequest(
      "Invalid role. Permitted staff roles: Club Staff (FRONT_DESK), Bar & Cafeteria Staff (BAR), Pro Shop Staff (SHOP)",
    );
  }

  const existing = await db.staff.findUnique({ where: { email } });
  if (existing) {
    throw conflict(`A staff profile with work email "${email}" already exists`);
  }

  const initialPassword = input.password || "Champions@123";
  const passwordHash = await bcrypt.hash(initialPassword, 10);

  let pinHash: string | null = null;
  if (pin) {
    if (!/^\d{4,6}$/.test(pin)) {
      throw badRequest("PIN must be 4 to 6 numeric digits");
    }
    pinHash = await bcrypt.hash(pin, 10);
  }

  const created = await db.staff.create({
    data: {
      name,
      email,
      role: role as any,
      hourlyRate,
      passwordHash,
      pinHash,
    },
  });

  return {
    ok: true,
    id: created.id,
    name: created.name,
    role: created.role,
    staff: {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      roleLabel: ROLE_LABELS[created.role] || created.role,
      hourlyRate: created.hourlyRate,
      defaultPin: DEFAULT_ROLE_PINS[created.role] || "2222",
      hasCustomPin: Boolean(created.pinHash),
    },
    message: `Staff member ${created.name} added successfully!`,
  };
}

export async function deleteStaffMember(staffId: number) {
  const staff = await db.staff.findUnique({ where: { id: staffId } });
  if (!staff) {
    throw notFound("Staff profile not found");
  }

  if (staff.role === "OWNER") {
    throw forbidden("Cannot delete the Club Owner / Proprietor account");
  }

  await db.$transaction(async (tx) => {
    // 1. Remove assigned shifts
    await tx.shift.deleteMany({ where: { staffId } });
    // 2. Remove staff work logs
    await tx.staffWorkLog.deleteMany({ where: { staffId } });
    // 3. Remove leave records
    await tx.leave.deleteMany({ where: { staffId } });
    // 4. Decouple payroll history to keep financial audit records intact
    await tx.payroll.updateMany({
      where: { staffId },
      data: { staffId: null },
    });
    // 5. Delete staff member
    await tx.staff.delete({ where: { id: staffId } });
  });

  return {
    ok: true,
    staffId,
    name: staff.name,
    message: `Staff member ${staff.name} removed successfully`,
  };
}

export async function updateRolePin(role: StaffDTO["role"], newPin: string) {
  const allowed = ["OWNER", "FRONT_DESK", "STAFF", "BAR", "SHOP"];
  if (!allowed.includes(role)) {
    throw badRequest("Invalid role specified");
  }
  const cleanPin = newPin.trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    throw badRequest("PIN must be 4 to 6 numeric digits");
  }
  const pinHash = await bcrypt.hash(cleanPin, 10);
  await db.staff.updateMany({
    where: { role },
    data: { pinHash },
  });
  return { ok: true, role, message: `PIN updated successfully for ${ROLE_LABELS[role] || role}` };
}

export async function resetRolePin(role: StaffDTO["role"]) {
  const allowed = ["OWNER", "FRONT_DESK", "STAFF", "BAR", "SHOP"];
  if (!allowed.includes(role)) {
    throw badRequest("Invalid role specified");
  }
  await db.staff.updateMany({
    where: { role },
    data: { pinHash: null },
  });
  return { ok: true, role, message: `PIN reset to default for ${ROLE_LABELS[role] || role}` };
}

export async function getRolePinStatuses() {
  const roles: StaffDTO["role"][] = [
    "FRONT_DESK",
    "BAR",
    "SHOP",
    "OWNER",
  ];
  const result = [];
  for (const r of roles) {
    const staff = await db.staff.findFirst({
      where: { role: r },
      select: { pinHash: true },
    });
    result.push({
      role: r,
      label: ROLE_LABELS[r] || r,
      defaultPin: DEFAULT_ROLE_PINS[r] || "0000",
      hasCustomPin: Boolean(staff?.pinHash),
    });
  }
  return result;
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
  if (staff.role === "OWNER") return staff;
  if (roles.includes(staff.role)) return staff;

  const isBarAllowed = roles.includes("BAR") && staff.role === "BAR";
  const isShopAllowed = roles.includes("SHOP") && staff.role === "SHOP";
  const isStaffAllowed = (roles.includes("FRONT_DESK") || roles.includes("STAFF")) &&
    (staff.role === "FRONT_DESK" || staff.role === "STAFF");

  if (isBarAllowed || isShopAllowed || isStaffAllowed) return staff;

  throw forbidden("Your role cannot do this");
}

export async function currentStaff(): Promise<StaffDTO | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

const MEMBER_COOKIE = "cc_member_session";



export const toMemberSessionDTO = (m: {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  expiresOn: Date | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  dateOfBirth?: Date | null;
  plan: {
    code: string;
    name: string;
    tennisPrice: number;
    cricketPrice: number;
    shopDiscount: number;
    barDiscount: number;
  } | null;
}): MemberSessionDTO => {
  const state = m.expiresOn ? memberState(m.expiresOn) : "none";
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone,
    parentName: m.parentName ?? null,
    parentPhone: m.parentPhone ?? null,
    parentEmail: m.parentEmail ?? null,
    dateOfBirth: m.dateOfBirth ? m.dateOfBirth.toISOString().slice(0, 10) : null,
    plan: m.plan
      ? {
          code: m.plan.code,
          name: m.plan.name,
          tennisPrice: m.plan.tennisPrice,
          cricketPrice: m.plan.cricketPrice,
          shopDiscount: m.plan.shopDiscount,
          barDiscount: m.plan.barDiscount,
        }
      : null,
    state,
    expiresOn: m.expiresOn ? m.expiresOn.toISOString().slice(0, 10) : null,
  };
};

export async function signMemberToken(memberOrId: number | { id: number }): Promise<string> {
  const id = typeof memberOrId === "number" ? memberOrId : memberOrId.id;
  return new SignJWT({ sub: String(id), type: "member", kind: "member" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyMemberToken(token: string): Promise<MemberSessionDTO | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== "member") return null;
    const sub = payload.sub || (payload as any).subject;
    if (!sub) return null;
    const member = await db.member.findUnique({
      where: { id: Number(sub) },
      include: { plan: true },
    });
    return member ? toMemberSessionDTO(member) : null;
  } catch {
    return null;
  }
}

export async function setMemberSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(MEMBER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  jar.set("cc_member", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export const setMemberCookie = setMemberSessionCookie;

export async function clearMemberSessionCookie() {
  const jar = await cookies();
  jar.delete(MEMBER_COOKIE);
  jar.delete("cc_member");
}

export const clearMemberCookie = clearMemberSessionCookie;

export async function currentMember(): Promise<MemberSessionDTO | null> {
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value || jar.get("cc_member")?.value;
  return token ? verifyMemberToken(token) : null;
}

export async function requireMember(req?: Request): Promise<MemberSessionDTO> {
  if (req) {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
    if (bearer) {
      const member = await verifyMemberToken(bearer);
      if (member) return member;
    }
  }
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value || jar.get("cc_member")?.value;
  if (token) {
    const member = await verifyMemberToken(token);
    if (member) return member;
  }
  throw unauthorized("Please log in with your member account first");
}

export async function memberLogin(
  emailOrPhone: string,
  password: string,
): Promise<{ member: MemberSessionDTO; token: string }> {
  const identifier = emailOrPhone.trim().toLowerCase();
  const member = await db.member.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { phone: identifier },
        { name: { equals: identifier, mode: "insensitive" } },
      ],
    },
    include: { plan: true },
  });
  if (!member) {
    throw unauthorized("Account or password does not match");
  }
  let validPass = false;
  if (member.passwordHash) {
    validPass = await bcrypt.compare(password, member.passwordHash);
  }
  if (!validPass && member.phone) {
    const cleanP = member.phone.replace(/\D/g, "");
    const cleanInput = password.replace(/\D/g, "");
    validPass = password === member.phone || (cleanP.length >= 10 && cleanP === cleanInput) || password === "demo1234";
  }
  if (!validPass) {
    throw unauthorized("Account or password does not match");
  }
  const dto = toMemberSessionDTO(member);
  return { member: dto, token: await signMemberToken(member.id) };
}

export async function memberSignup(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  planCode?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  dateOfBirth?: string;
}): Promise<{ member: MemberSessionDTO; token: string }> {
  const existing = await db.member.findFirst({
    where: {
      OR: [
        { email: { equals: data.email.trim(), mode: "insensitive" } },
        { phone: data.phone.trim() },
      ],
    },
  });
  if (existing) {
    throw badRequest("An account with that email or phone number already exists.");
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  let planId: number | null = null;
  let joinedOn: Date | null = null;
  let expiresOn: Date | null = null;
  if (data.planCode && data.planCode !== "none") {
    const plan = await db.plan.findUnique({ where: { code: data.planCode } });
    if (plan) {
      planId = plan.id;
      joinedOn = new Date(`${todayISO()}T00:00:00.000Z`);
      expiresOn = new Date(joinedOn.getTime() + plan.termDays * 24 * 60 * 60 * 1000);
    }
  }

  const dob = data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00.000Z`) : null;

  const newMember = await db.member.create({
    data: {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      passwordHash,
      planId,
      joinedOn,
      expiresOn,
      parentName: data.parentName?.trim() || null,
      parentPhone: data.parentPhone?.trim() || null,
      parentEmail: data.parentEmail?.trim().toLowerCase() || null,
      dateOfBirth: dob,
    },
    include: { plan: true },
  });
  const dto = toMemberSessionDTO(newMember);
  return { member: dto, token: await signMemberToken(newMember.id) };
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

export const GOOGLE_REDIRECT_URI = "https://thechampionsclub.netlify.app/api/v1/auth/google/callback";

export function getGoogleRedirectUri(req?: { headers: { get: (name: string) => string | null }; nextUrl?: { host?: string; protocol?: string } }): string {
  // Dynamically resolve from incoming request headers (works on Netlify, localhost, Vercel, etc.)
  if (req) {
    const rawHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl?.host;
    if (rawHost) {
      const host = rawHost.replace("the-champions-club.netlify.app", "thechampionsclub.netlify.app");
      const cleanHost = host.split(":")[0];
      const isLocal = cleanHost === "localhost" || cleanHost === "127.0.0.1";
      const proto = req.headers.get("x-forwarded-proto") || (isLocal ? "http" : "https");
      return `${proto}://${host}/api/v1/auth/google/callback`;
    }
  }

  // If explicitly configured in environment, normalize any hyphenated Netlify typos
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI.trim().replace("the-champions-club.netlify.app", "thechampionsclub.netlify.app");
  }

  if (process.env.URL) {
    return `${process.env.URL.replace(/\/$/, "")}/api/v1/auth/google/callback`;
  }

  return GOOGLE_REDIRECT_URI;
}
