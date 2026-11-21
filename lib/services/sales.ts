import { db } from "../db";
import { badRequest, conflict, notFound } from "../errors";
import { istDayStart, todayISO } from "../format";
import type { OrderDTO, TabDTO } from "../types";
import { memberState, findMemberByName } from "./members";

// Shop orders and bar tabs. One stock list serves the counter and the
// website: a sale checks stock and takes it off in the same transaction,
// so the shelf can never sell what it does not have. Member plan
// discounts are applied here, from the plan on record, never by the client.

type Item = { productId: number; qty: number };

async function priceItems(items: Item[], category: "GEAR" | "BAR") {
  const ids = items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: ids } } });
  if (products.length !== ids.length) throw badRequest("One of those products does not exist");
  return items.map((i) => {
    const p = products.find((x) => x.id === i.productId)!;
    if (p.category !== category) throw badRequest(`${p.name} is not sold here`);
    return { product: p, qty: i.qty, lineTotal: p.price * i.qty };
  });
}

// ---------- Shop: pickup orders ----------

export async function createOrder(input: {
  items: Item[];
  name: string;
  phone: string;
  payMethod: "CASH" | "CARD" | "UPI";
  fulfilment?: "PICKUP" | "DELIVERY";
  address?: string;
}) {
  const fulfilment = input.fulfilment ?? "PICKUP";
  const address = fulfilment === "DELIVERY" ? (input.address ?? "").trim() : "";
  if (fulfilment === "DELIVERY" && address.length < 10)
    throw badRequest("Add the full delivery address");
  const member = await findMemberByName(input.name);
  const active = member && memberState(member.expiresOn) === "active";
  const discountPct = active ? member.plan.shopDiscount : 0;

  return db.$transaction(async (tx) => {
    const lines = await priceItems(input.items, "GEAR");
    for (const l of lines) {
      if (l.product.stock !== null && l.qty > l.product.stock)
        throw conflict(
          l.product.stock === 0
            ? `${l.product.name} is out of stock`
            : `Only ${l.product.stock} left of ${l.product.name}`,
        );
    }
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const discount = Math.round((subtotal * discountPct) / 100);
    const order = await tx.order.create({
      data: {
        memberId: member?.id,
        name: input.name,
        phone: input.phone,
        subtotal,
        discount,
        total: subtotal - discount,
        payMethod: input.payMethod,
        fulfilment,
        address: address || null,
        items: {
          create: lines.map((l) => ({ productId: l.product.id, qty: l.qty, price: l.product.price })),
        },
      },
      include: { items: { include: { product: true } } },
    });
    for (const l of lines) {
      if (l.product.stock !== null)
        await tx.product.update({ where: { id: l.product.id }, data: { stock: { decrement: l.qty } } });
    }
    return toOrderDTO(order);
  });
}

type OrderRow = {
  id: number;
  name: string;
  phone: string;
  subtotal: number;
  discount: number;
  total: number;
  payMethod: "CASH" | "CARD" | "UPI";
  fulfilment: string;
  address: string | null;
  createdAt: Date;
  items: { productId: number; qty: number; price: number; product: { name: string } }[];
};

export const toOrderDTO = (o: OrderRow): OrderDTO => ({
  id: o.id,
  name: o.name,
  phone: o.phone,
  subtotal: o.subtotal,
  discount: o.discount,
  total: o.total,
  payMethod: o.payMethod,
  fulfilment: o.fulfilment === "DELIVERY" ? "DELIVERY" : "PICKUP",
  address: o.address,
  createdAt: o.createdAt.toISOString(),
  items: o.items.map((i) => ({ productId: i.productId, name: i.product.name, qty: i.qty, price: i.price })),
});

export async function listOrders(): Promise<OrderDTO[]> {
  const rows = await db.order.findMany({
    where: { createdAt: { gte: istDayStart(todayISO()) } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrderDTO);
}

// ---------- Bar: tabs with a real open → settle life ----------

type TabRow = {
  id: number;
  who: string;
  tableNo: number | null;
  status: "OPEN" | "SETTLED";
  planCode: string;
  discountPct: number;
  subtotal: number;
  total: number;
  payMethod: "CASH" | "CARD" | "UPI" | null;
  items: { productId: number; qty: number; price: number; product: { name: string } }[];
};

const tabInclude = { items: { include: { product: true } } } as const;

export const toTabDTO = (t: TabRow): TabDTO => ({
  id: t.id,
  who: t.who,
  tableNo: t.tableNo,
  status: t.status,
  planCode: t.planCode,
  discountPct: t.discountPct,
  subtotal: t.subtotal,
  total: t.total,
  payMethod: t.payMethod,
  items: t.items.map((i) => ({ productId: i.productId, name: i.product.name, qty: i.qty, price: i.price })),
});

async function getTabRow(id: number): Promise<TabRow> {
  const tab = await db.tab.findUnique({ where: { id }, include: tabInclude });
  if (!tab) throw notFound("No such tab");
  return tab as TabRow;
}

export async function listTabs(): Promise<TabDTO[]> {
  const rows = await db.tab.findMany({
    where: {
      OR: [{ status: "OPEN" }, { settledAt: { gte: istDayStart(todayISO()) } }],
    },
    include: tabInclude,
    orderBy: { openedAt: "asc" },
  });
  return rows.map((t) => toTabDTO(t as TabRow));
}

export async function openTab(input: { who: string; tableNo?: number }): Promise<TabDTO> {
  if (input.tableNo !== undefined) {
    if (input.tableNo < 1 || input.tableNo > 8) throw badRequest("Tables run T1 to T8");
    const busy = await db.tab.findFirst({ where: { tableNo: input.tableNo, status: "OPEN" } });
    if (busy) throw conflict(`Table ${input.tableNo} already has an open tab (${busy.who})`);
  }
  const member = await findMemberByName(input.who);
  const tab = await db.tab.create({
    data: {
      who: member?.name ?? input.who,
      memberId: member?.id,
      tableNo: input.tableNo,
      status: "OPEN",
      planCode: member?.plan.code ?? "walkin",
    },
    include: tabInclude,
  });
  return toTabDTO(tab as TabRow);
}

export async function addTabItems(id: number, items: Item[]): Promise<TabDTO> {
  const tab = await getTabRow(id);
  if (tab.status !== "OPEN") throw conflict("That tab is already settled");
  const lines = await priceItems(items, "BAR");
  await db.$transaction(async (tx) => {
    for (const l of lines) {
      await tx.tabItem.upsert({
        where: { tabId_productId: { tabId: id, productId: l.product.id } },
        create: { tabId: id, productId: l.product.id, qty: l.qty, price: l.product.price },
        update: { qty: { increment: l.qty } },
      });
    }
    const now = await tx.tabItem.findMany({ where: { tabId: id } });
    const subtotal = now.reduce((s, i) => s + i.price * i.qty, 0);
    await tx.tab.update({ where: { id }, data: { subtotal, total: subtotal } });
  });
  return toTabDTO(await getTabRow(id));
}

export async function settleTab(id: number, payMethod: "CASH" | "CARD" | "UPI"): Promise<TabDTO> {
  const tab = await db.tab.findUnique({
    where: { id },
    include: { member: { include: { plan: true } } },
  });
  if (!tab) throw notFound("No such tab");
  if (tab.status !== "OPEN") throw conflict("That tab is already settled");
  // The discount comes from the member's plan on record, applied here at
  // settle time. Nobody types a discount, and nobody can inflate one.
  const member = tab.member;
  const discountPct =
    member && memberState(member.expiresOn) === "active" ? member.plan.barDiscount : 0;
  const discount = Math.round((tab.subtotal * discountPct) / 100);
  const updated = await db.tab.update({
    where: { id },
    data: {
      status: "SETTLED",
      planCode: discountPct && member ? member.plan.code : "walkin",
      discountPct,
      total: tab.subtotal - discount,
      payMethod,
      settledAt: new Date(),
    },
    include: tabInclude,
  });
  return toTabDTO(updated as TabRow);
}
