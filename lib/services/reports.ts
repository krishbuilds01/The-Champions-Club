import { db } from "../db";
import { badRequest } from "../errors";
import { addDaysISO, isISODate, todayISO } from "../format";
import type { TaxSummaryDTO } from "../types";

// Tax reporting for the owner: what was billed and what tax was
// charged on invoices in the window, against the tax deducted from
// staff pay in the same window. Invoices count by the day they were
// issued; payroll counts by month (a YYYY-MM string, so the months
// overlapping the window are compared as strings).
export function defaultTaxWindow(): { from: string; to: string } {
  const first = `${todayISO().slice(0, 7)}-01`;
  const [y, m] = first.split("-").map(Number);
  const nextFirst = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  return { from: first, to: addDaysISO(nextFirst, -1) };
}

export async function taxSummary(input: { from?: string; to?: string }): Promise<TaxSummaryDTO> {
  // Both dates must be given together; a half-open window falls back
  // to the current month rather than silently mixing windows.
  const w = input.from && input.to ? { from: input.from, to: input.to } : defaultTaxWindow();
  if (!isISODate(w.from) || !isISODate(w.to)) throw badRequest("Dates must be real YYYY-MM-DD dates");
  if (w.from > w.to) throw badRequest("The start date cannot be after the end date");
  const fromDay = new Date(`${w.from}T00:00:00.000Z`);
  const toDay = new Date(`${addDaysISO(w.to, 1)}T00:00:00.000Z`);
  const [invoices, payroll] = await Promise.all([
    db.invoice.aggregate({
      where: { issuedOn: { gte: fromDay, lt: toDay } },
      _sum: { amount: true, taxAmount: true },
      _count: true,
    }),
    db.payroll.aggregate({
      where: { month: { gte: w.from.slice(0, 7), lte: w.to.slice(0, 7) } },
      _sum: { tax: true },
      _count: true,
    }),
  ]);
  const invoiced = invoices._sum.amount ?? 0;
  // taxAmount is null on invoices raised before tax was recorded, or
  // with no tax rate — null counts as no tax, never as an error.
  const invoiceTax = invoices._sum.taxAmount ?? 0;
  const payrollTax = payroll._sum.tax ?? 0;
  return {
    from: w.from,
    to: w.to,
    invoiced,
    invoiceCount: invoices._count,
    invoiceTax,
    payrollTax,
    payrollCount: payroll._count,
    // Tax charged to clients less tax already deducted from staff pay.
    netTax: invoiceTax - payrollTax,
  };
}
