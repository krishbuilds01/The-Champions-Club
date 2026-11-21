import { db } from "../db";
import { badRequest } from "../errors";
import { addDaysISO, isISODate, istDayStart } from "../format";
import type { DashboardDTO, MoneySplit } from "../types";
import { toBookingDTO } from "./bookings";
import { expiringMembers } from "./members";

// The owner's money in one read: courts + shop + bar for today, the last
// 7 days and the last 30 days, how the day was paid, who is on court,
// and what is running low in the shop. Days are IST days; only paid work
// counts — booked courts, placed orders and SETTLED tabs. An open tab
// is not revenue yet.
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function sums(fromISO: string, toISO: string): Promise<MoneySplit> {
  const [courtAgg, orders, tabs] = await Promise.all([
    db.booking.aggregate({
      where: { date: { gte: day(fromISO), lte: day(toISO) }, state: "BOOKED" },
      _sum: { price: true },
    }),
    db.order.findMany({
      // A pending online order is not money yet; it joins the takings
      // when its payment confirms.
      where: { createdAt: { gte: istDayStart(fromISO), lt: istDayStart(addDaysISO(toISO, 1)) }, payState: { not: "PENDING" } },
      select: { total: true },
    }),
    db.tab.findMany({
      where: {
        status: "SETTLED",
        settledAt: { gte: istDayStart(fromISO), lt: istDayStart(addDaysISO(toISO, 1)) },
      },
      select: { total: true },
    }),
  ]);
  const courts = courtAgg._sum.price ?? 0;
  const shop = orders.reduce((s, o) => s + o.total, 0);
  const bar = tabs.reduce((s, t) => s + t.total, 0);
  return { courts, shop, bar, total: courts + shop + bar };
}

export async function getDashboard(date: string): Promise<DashboardDTO> {
  if (!isISODate(date)) throw badRequest("Date must be YYYY-MM-DD");

  const [today, week, month, dayOrders, dayTabs, onCourt, low, expiring] = await Promise.all([
    sums(date, date),
    sums(addDaysISO(date, -6), date),
    sums(addDaysISO(date, -29), date),
    db.order.findMany({
      where: { createdAt: { gte: istDayStart(date), lt: istDayStart(addDaysISO(date, 1)) } },
      select: { total: true, payMethod: true },
    }),
    db.tab.findMany({
      where: { status: "SETTLED", settledAt: { gte: istDayStart(date), lt: istDayStart(addDaysISO(date, 1)) } },
      select: { total: true, payMethod: true },
    }),
    db.booking.findMany({
      where: { date: day(date), state: "BOOKED" },
      include: { court: true },
      orderBy: { start: "asc" },
    }),
    db.product.findMany({ where: { category: "GEAR" }, orderBy: { stock: "asc" } }),
    expiringMembers(14),
  ]);

  const byMethodMap = new Map<string, number>();
  for (const r of [...dayOrders, ...dayTabs])
    if (r.payMethod) byMethodMap.set(r.payMethod, (byMethodMap.get(r.payMethod) ?? 0) + r.total);

  return {
    date,
    totals: today,
    periods: { today, week, month },
    byMethod: [...byMethodMap.entries()].map(([method, amount]) => ({
      method: method as "CASH" | "CARD" | "UPI" | "ONLINE",
      amount,
    })),
    onCourt: onCourt.map(toBookingDTO),
    lowStock: low
      .filter((p) => p.stock !== null && p.stock <= p.lowAt)
      .map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, lowAt: p.lowAt, category: p.category })),
    expiring,
  };
}
