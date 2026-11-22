-- Add payment, renewal, leave and tax fields, and the Leave /
-- MembershipRenewal tables (prisma/schema.prisma, 2026-11-22).
-- Run with: npx prisma migrate deploy
-- PostgreSQL. All additions are nullable or defaulted, so existing rows survive.
-- Every statement is IF NOT EXISTS-guarded: an earlier migration already
-- added Member.dateOfBirth, and this file must apply cleanly on a fresh
-- database as well as on one that picked up some fields another way.

ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "payMethod" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "payState" TEXT DEFAULT 'UNPAID';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Booking_memberId_idx" ON "Booking"("memberId");

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PLACED';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Order_memberId_idx" ON "Order"("memberId");

CREATE INDEX IF NOT EXISTS "Tab_memberId_idx" ON "Tab"("memberId");

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "taxRate" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "taxAmount" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "memberId" INTEGER;

ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "staffId" INTEGER;
-- NOTE: PostgreSQL treats NULLs as distinct in a unique index, so this
-- only binds rows that have a staff member linked (all payrolls created
-- through the API do; older rows with NULL staffId are not constrained).
CREATE UNIQUE INDEX IF NOT EXISTS "Payroll_staffId_month_key" ON "Payroll"("staffId", "month");

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

CREATE TABLE IF NOT EXISTS "Leave" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Leave_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Leave_staffId_idx" ON "Leave"("staffId");

CREATE TABLE IF NOT EXISTS "MembershipRenewal" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "payMethod" TEXT NOT NULL,
    "renewedFrom" DATE NOT NULL,
    "renewedTo" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembershipRenewal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MembershipRenewal_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MembershipRenewal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MembershipRenewal_memberId_idx" ON "MembershipRenewal"("memberId");
