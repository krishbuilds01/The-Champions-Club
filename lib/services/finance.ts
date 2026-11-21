import { db } from "../db";
import { conflict, notFound } from "../errors";
import type { ExpenseDTO, InvoiceDTO, PayrollDTO } from "../types";

// Owner finance, deliberately light: bills out, money out, staff pay.
// No ledgers or double entry — just the records the owner actually
// keeps, with the totals that matter.

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function listInvoices(): Promise<InvoiceDTO[]> {
  const rows = await db.invoice.findMany({ orderBy: [{ status: "asc" }, { issuedOn: "desc" }] });
  return rows.map((r) => ({
    id: r.id, billedTo: r.billedTo, detail: r.detail, amount: r.amount,
    status: r.status === "PAID" ? "PAID" : "UNPAID",
    issuedOn: iso(r.issuedOn), paidAt: r.paidAt ? iso(r.paidAt) : null,
  }));
}

export async function createInvoice(input: { billedTo: string; detail: string; amount: number }): Promise<InvoiceDTO> {
  const r = await db.invoice.create({ data: input });
  return {
    id: r.id, billedTo: r.billedTo, detail: r.detail, amount: r.amount,
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
    status: "PAID", issuedOn: iso(r.issuedOn), paidAt: r.paidAt ? iso(r.paidAt) : null,
  };
}

export async function listExpenses(): Promise<ExpenseDTO[]> {
  const rows = await db.expense.findMany({ orderBy: { spentOn: "desc" } });
  return rows.map((r) => ({
    id: r.id, title: r.title, category: r.category, amount: r.amount,
    spentOn: iso(r.spentOn), note: r.note,
  }));
}

export async function createExpense(input: { title: string; category: string; amount: number; spentOn: string; note: string }): Promise<ExpenseDTO> {
  const r = await db.expense.create({
    data: { title: input.title, category: input.category, amount: input.amount, spentOn: new Date(`${input.spentOn}T00:00:00.000Z`), note: input.note },
  });
  return { id: r.id, title: r.title, category: r.category, amount: r.amount, spentOn: iso(r.spentOn), note: r.note };
}

export async function listPayroll(): Promise<PayrollDTO[]> {
  const rows = await db.payroll.findMany({ orderBy: [{ month: "desc" }, { staffName: "asc" }] });
  return rows.map((r) => ({
    id: r.id, staffName: r.staffName, month: r.month, salary: r.salary,
    leaveDays: r.leaveDays, tax: r.tax, net: r.salary - r.tax,
    status: r.status === "PAID" ? "PAID" : "PENDING",
  }));
}

export async function createPayroll(input: { staffName: string; month: string; salary: number; leaveDays: number; tax: number }): Promise<PayrollDTO> {
  const r = await db.payroll.create({ data: input });
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
