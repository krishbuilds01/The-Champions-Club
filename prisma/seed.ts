import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// The demo-day reset. This WIPES the club tables and loads the exact
// dataset the demo script runs on, with every date relative to today
// (IST): baseline dashboard Courts ₹4,200 · Shop ₹0 · Bar ₹0 today, plus
// a light history over the past 30 days so the week and month views show
// real, different numbers, Tennis 1
// free at 18:00, Priya Nair already at her 2-booking limit, Ananya Iyer
// expired, Gym Towel low, Water Bottle out, and Aarav Mehta's ₹400 tab
// open on Table 3 (not revenue until settled). Re-run it on the morning
// of the demo so rehearsals leave no trace.
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const dayMs = 24 * 60 * 60 * 1000;
// Today in India, as a UTC-midnight date (the @db.Date convention).
const todayIST = () => {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
};
const plus = (base: Date, days: number) => new Date(base.getTime() + days * dayMs);

async function main() {
  // One truncate, identities restarted, so ids are stable run to run.
  await db.$executeRawUnsafe(
    'TRUNCATE "TabItem","Tab","OrderItem","Order","Booking","Enquiry","Member","Product","Court","Plan","Staff" RESTART IDENTITY CASCADE',
  );

  const today = todayIST();

  await db.plan.createMany({
    data: [
      { code: "gold", name: "Gold", tennisPrice: 300, cricketPrice: 500, shopDiscount: 15, barDiscount: 20, termDays: 365 },
      { code: "silver", name: "Silver", tennisPrice: 400, cricketPrice: 650, shopDiscount: 10, barDiscount: 10, termDays: 180 },
      { code: "junior", name: "Junior", tennisPrice: 250, cricketPrice: 400, shopDiscount: 5, barDiscount: 0, termDays: 365 },
    ],
  });
  await db.court.createMany({
    data: [
      { name: "Tennis 1", sport: "Tennis", walkinPrice: 500 },
      { name: "Tennis 2", sport: "Tennis", walkinPrice: 500 },
      { name: "Cricket 1", sport: "Cricket", walkinPrice: 800 },
    ],
  });
  await db.product.createMany({
    data: [
      { name: "Tennis Racket — ProStaff", price: 4500, stock: 12, category: "GEAR" },
      { name: "Court Shoes", price: 3000, stock: 8, category: "GEAR" },
      { name: "Cricket Bat — English Willow", price: 6000, stock: 6, category: "GEAR" },
      { name: "Tennis Balls (can of 3)", price: 350, stock: 40, category: "GEAR" },
      { name: "Cricket Ball (leather)", price: 500, stock: 25, category: "GEAR" },
      { name: "Club T-Shirt", price: 800, stock: 30, category: "GEAR" },
      { name: "Kit Bag", price: 1800, stock: 10, category: "GEAR" },
      { name: "Wristband Pair", price: 200, stock: 50, category: "GEAR" },
      { name: "Gym Towel", price: 300, stock: 3, category: "GEAR" }, // deliberately low
      { name: "Water Bottle 1L", price: 450, stock: 0, category: "GEAR" }, // deliberately out
      { name: "Cold Coffee", price: 180, category: "BAR" },
      { name: "Protein Shake", price: 250, category: "BAR" },
      { name: "Club Sandwich", price: 220, category: "BAR" },
      { name: "Masala Fries", price: 150, category: "BAR" },
      { name: "Iced Tea", price: 140, category: "BAR" },
      { name: "Fresh Lime Soda", price: 120, category: "BAR" },
    ],
  });

  const plans = await db.plan.findMany();
  const planId = (code: string) => plans.find((p) => p.code === code)!.id;
  const member = (name: string, phone: string, code: string, expiresInDays: number) => ({
    name,
    phone,
    planId: planId(code),
    joinedOn: plus(today, -90),
    expiresOn: plus(today, expiresInDays),
  });
  await db.member.createMany({
    data: [
      member("Aarav Mehta", "9811000001", "gold", 240),
      member("Priya Nair", "9811000002", "gold", 300),
      member("Rohan Shah", "9811000003", "silver", 120),
      member("Sneha Kulkarni", "9811000004", "silver", 3), // renews this week
      member("Kabir Singh", "9811000005", "junior", 200),
      member("Ananya Iyer", "9811000006", "junior", -5), // already expired
    ],
  });

  const courts = await db.court.findMany();
  const courtId = (name: string) => courts.find((c) => c.name === name)!.id;
  const members = await db.member.findMany();
  const memberId = (name: string) => members.find((m) => m.name === name)?.id;
  const booking = (court: string, start: number, who: string, price: number) => ({
    courtId: courtId(court),
    memberId: memberId(who),
    who,
    date: today,
    start,
    type: "REGULAR" as const,
    price,
  });
  await db.booking.createMany({
    data: [
      booking("Tennis 1", 420, "Priya Nair", 300), // 07:00
      booking("Tennis 1", 1020, "Rohan Shah", 400), // 17:00
      booking("Tennis 1", 1140, "Kabir Singh", 250), // 19:00 — 18:00 stays free for the demo
      booking("Tennis 2", 480, "Walk-in", 500), // 08:00
      booking("Tennis 2", 1080, "Priya Nair", 300), // 18:00 — her second booking today
      booking("Tennis 2", 1140, "Walk-in", 500), // 19:00
      booking("Cricket 1", 960, "Rohan Shah", 650), // 16:00
      booking("Cricket 1", 1080, "Aarav Mehta", 500), // 18:00
      booking("Cricket 1", 1200, "Walk-in", 800), // 20:00
    ],
  });

  // Aarav's open tab on Table 3: ₹400, unpaid, not revenue yet.
  const bar = await db.product.findMany({ where: { category: "BAR" } });
  const barId = (name: string) => bar.find((p) => p.name === name)!;
  await db.tab.create({
    data: {
      memberId: memberId("Aarav Mehta"),
      who: "Aarav Mehta",
      tableNo: 3,
      status: "OPEN",
      planCode: "gold",
      subtotal: 400,
      total: 400,
      items: {
        create: [
          { productId: barId("Protein Shake").id, qty: 1, price: 250 },
          { productId: barId("Masala Fries").id, qty: 1, price: 150 },
        ],
      },
    },
  });

  // History: past bookings, orders and settled tabs across the last
  // 30 days, so the dashboard's week and month views are not just
  // today repeated. None of it lands today, so the demo baseline
  // (Courts ₹4,200 · Shop ₹0 · Bar ₹0) is untouched.
  const past = (daysAgo: number) => new Date(plus(today, -daysAgo).getTime() + 12 * 60 * 60 * 1000);
  const bookingOn = (daysAgo: number, court: string, start: number, who: string, price: number) => ({
    courtId: courtId(court),
    memberId: memberId(who),
    who,
    date: plus(today, -daysAgo),
    start,
    type: "REGULAR" as const,
    price,
  });
  await db.booking.createMany({
    data: [
      bookingOn(1, "Tennis 1", 420, "Priya Nair", 300),
      bookingOn(1, "Cricket 1", 1020, "Walk-in", 800),
      bookingOn(3, "Tennis 2", 1080, "Rohan Shah", 400),
      bookingOn(3, "Tennis 1", 480, "Walk-in", 500),
      bookingOn(6, "Cricket 1", 960, "Aarav Mehta", 500),
      bookingOn(12, "Tennis 1", 1020, "Kabir Singh", 250),
      bookingOn(12, "Tennis 2", 420, "Priya Nair", 300),
      bookingOn(20, "Cricket 1", 1080, "Walk-in", 800),
      bookingOn(20, "Tennis 2", 1140, "Rohan Shah", 400),
    ],
  });
  const gear = await db.product.findMany({ where: { category: "GEAR" } });
  const gearId = (name: string) => gear.find((p) => p.name === name)!;
  await db.order.create({
    data: {
      name: "Dev Malhotra", phone: "9812000011", subtotal: 700, discount: 0, total: 700, payMethod: "CASH", createdAt: past(1),
      items: { create: [{ productId: gearId("Tennis Balls (can of 3)").id, qty: 2, price: 350 }] },
    },
  });
  await db.order.create({
    data: {
      memberId: memberId("Priya Nair"), name: "Priya Nair", phone: "9811000002", subtotal: 800, discount: 120, total: 680, payMethod: "UPI", createdAt: past(4),
      items: { create: [{ productId: gearId("Club T-Shirt").id, qty: 1, price: 800 }] },
    },
  });
  await db.order.create({
    data: {
      name: "Walk-in", phone: "", subtotal: 3000, discount: 0, total: 3000, payMethod: "CARD", createdAt: past(15),
      items: { create: [{ productId: gearId("Court Shoes").id, qty: 1, price: 3000 }] },
    },
  });
  await db.tab.create({
    data: {
      who: "Walk-in guest", status: "SETTLED", planCode: "walkin", subtotal: 400, total: 400, payMethod: "CASH", settledAt: past(2),
      items: {
        create: [
          { productId: barId("Cold Coffee").id, qty: 1, price: 180 },
          { productId: barId("Club Sandwich").id, qty: 1, price: 220 },
        ],
      },
    },
  });
  await db.tab.create({
    data: {
      memberId: memberId("Rohan Shah"), who: "Rohan Shah", status: "SETTLED", planCode: "silver", discountPct: 10, subtotal: 400, total: 360, payMethod: "UPI", settledAt: past(9),
      items: {
        create: [
          { productId: barId("Protein Shake").id, qty: 1, price: 250 },
          { productId: barId("Masala Fries").id, qty: 1, price: 150 },
        ],
      },
    },
  });

  const demoHash = await bcrypt.hash("demo1234", 10);
  await db.staff.createMany({
    data: [
      { name: "Vikram Rao", email: "vikram@champions.club", passwordHash: demoHash, role: "OWNER" },
      { name: "Neha Gupta", email: "neha@champions.club", passwordHash: demoHash, role: "FRONT_DESK" },
      { name: "Arjun Patel", email: "arjun@champions.club", passwordHash: demoHash, role: "BAR" },
      { name: "Meera Joshi", email: "meera@champions.club", passwordHash: demoHash, role: "SHOP" },
      // The demo-login button and Google sign-in accounts.
      { name: "Club Owner", email: "owner@champions.club", passwordHash: await bcrypt.hash("champions", 10), role: "OWNER" },
      { name: "Krishna", email: "techbroyt@gmail.com", passwordHash: "$2b$10$MFmhdzW4QLmWPqFUOZRbP.PdYbcr6YzR6X0WEbXVTOKgboCGKqUTa", role: "OWNER" },
    ],
  });

  console.log("[seed] demo-day dataset loaded");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
