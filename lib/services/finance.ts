import { db } from "../db";
import { badRequest, conflict, notFound } from "../errors";
import type { ExpenseDTO, InvoiceDTO, PayrollDTO } from "../types";

// Owner finance, deliberately light: bills out, money out, staff pay.
// No ledgers or double entry — just the records the owner actually
// keeps, with the totals that matter.

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Service-level validation: the route validators already reject most
// of this, but the service must not trust its caller.
const isMonth = (m: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
const isRealDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, mo, d] = s.split("-").map(Number); // Date.parse("2026-02-30") rolls to Mar 2 — check the parts
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
};
const positiveInt = (n: number) => Number.isInteger(n) && n > 0;

export async function listInvoices(): Promise<InvoiceDTO[]> {
  const rows = await db.invoice.findMany({ orderBy: { issuedOn: "desc" }, take: 200 });
  // Unpaid first — money owed should not be buried under paid bills.
  // (status is a plain String, so Prisma cannot order UNPAID before PAID.)
  rows.sort((a, b) => Number(a.status === "PAID") - Number(b.status === "PAID"));
  return rows.map((r) => ({
    id: r.id, billedTo: r.billedTo, detail: r.detail, amount: r.amount,
    taxRate: r.taxRate, taxAmount: r.taxAmount,
    status: r.status === "PAID" ? "PAID" : "UNPAID",
    issuedOn: iso(r.issuedOn), paidAt: r.paidAt ? iso(r.paidAt) : null,
  }));
}

export async function createInvoice(input: { billedTo: string; detail: string; amount: number; taxRate?: number }): Promise<InvoiceDTO> {
  if (!positiveInt(input.amount)) throw badRequest("The invoice needs a positive amount");
  // The tax fields existed in the schema but nothing ever set them, so
  // tax reporting always read zero. A rate, when given, is applied
  // here — the tax amount is computed, never trusted from the client.
  if (input.taxRate !== undefined && (!Number.isInteger(input.taxRate) || input.taxRate < 0 || input.taxRate > 100))
    throw badRequest("Tax rate must be a whole percent between 0 and 100");
  const taxRate = input.taxRate ?? null;
  const taxAmount = taxRate === null ? null : Math.round((input.amount * taxRate) / 100);
  const r = await db.invoice.create({ data: { billedTo: input.billedTo, detail: input.detail, amount: input.amount, taxRate, taxAmount } });
  return {
    id: r.id, billedTo: r.billedTo, detail: r.detail, amount: r.amount,
    taxRate: r.taxRate, taxAmount: r.taxAmount,
    status: "UNPAID", issuedOn: iso(r.issuedOn), paidAt: null,
  };
}

export async function markInvoicePaid(id: number): Promise<InvoiceDTO> {
  const row = await db.invoice.findUnique({ where: { id } });
  if (!row) throw notFound("No such invoice");
  if (row.status === "PAID") throw conflict("That invoice is already paid");
  const r = await db.invoice.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  return {
    id: r.id, billedTo: r.billedTo, detail: r.detail, amount: r.amount,
    taxRate: r.taxRate, taxAmount: r.taxAmount,
    status: "PAID", issuedOn: iso(r.issuedOn), paidAt: r.paidAt ? iso(r.paidAt) : null,
  };
}

export async function listExpenses(): Promise<ExpenseDTO[]> {
  const rows = await db.expense.findMany({ orderBy: { spentOn: "desc" }, take: 200 });
  return rows.map((r) => ({
    id: r.id, title: r.title, category: r.category, amount: r.amount,
    spentOn: iso(r.spentOn), note: r.note,
  }));
}

export async function createExpense(input: { title: string; category: string; amount: number; spentOn: string; note: string }): Promise<ExpenseDTO> {
  if (!positiveInt(input.amount)) throw badRequest("The expense needs a positive amount");
  if (!isRealDate(input.spentOn)) throw badRequest("Date must be a real YYYY-MM-DD date");
  const r = await db.expense.create({
    data: { title: input.title, category: input.category, amount: input.amount, spentOn: new Date(`${input.spentOn}T00:00:00.000Z`), note: input.note },
  });
  return { id: r.id, title: r.title, category: r.category, amount: r.amount, spentOn: iso(r.spentOn), note: r.note };
}

export async function listPayroll(): Promise<PayrollDTO[]> {
  const rows = await db.payroll.findMany({ orderBy: [{ month: "desc" }, { staffName: "asc" }], take: 200 });
  return rows.map((r) => ({
    id: r.id, staffName: r.staffName, month: r.month, salary: r.salary,
    leaveDays: r.leaveDays, tax: r.tax, net: r.salary - r.tax,
    status: r.status === "PAID" ? "PAID" : "PENDING",
  }));
}

export async function createPayroll(input: { staffName: string; month: string; salary: number; leaveDays: number; tax: number }): Promise<PayrollDTO> {
  if (!positiveInt(input.salary)) throw badRequest("Salary must be a positive amount");
  if (!Number.isInteger(input.leaveDays) || input.leaveDays < 0) throw badRequest("Leave days cannot be negative");
  if (!Number.isInteger(input.tax) || input.tax < 0) throw badRequest("Tax cannot be negative");
  if (input.tax > input.salary) throw badRequest("Tax cannot be more than the salary — the net would be negative");
  if (!isMonth(input.month)) throw badRequest("Month must be YYYY-MM with a real month (01-12)");
  // The roster is the source of truth: free-text names let the same
  // person be paid twice under different spellings. Match the roster
  // case-insensitively and store the roster spelling.
  const staff = await db.staff.findFirst({ where: { name: { equals: input.staffName, mode: "insensitive" } } });
  if (!staff) throw badRequest(`No staff member called "${input.staffName}" — pick someone from the roster`);
  const dup = await db.payroll.findFirst({ where: { staffName: staff.name, month: input.month } });
  if (dup) throw conflict(`${staff.name} already has a payroll record for ${input.month}`);
  const r = await db.payroll.create({ data: { ...input, staffName: staff.name, staffId: staff.id } });
  return {
    id: r.id, staffName: r.staffName, month: r.month, salary: r.salary,
    leaveDays: r.leaveDays, tax: r.tax, net: r.salary - r.tax, status: "PENDING",
  };
}

export async function markPayrollPaid(id: number): Promise<PayrollDTO> {
  const row = await db.payroll.findUnique({ where: { id } });
  if (!row) throw notFound("No such payroll record");
  if (row.status === "PAID") throw conflict("That payroll record is already paid");
  const r = await db.payroll.update({ where: { id }, data: { status: "PAID" } });
  return {
    id: r.id, staffName: r.staffName, month: r.month, salary: r.salary,
    leaveDays: r.leaveDays, tax: r.tax, net: r.salary - r.tax, status: "PAID",
  };
}
