-- Add payment, renewal, leave and tax fields, and the Leave /
-- MembershipRenewal tables (prisma/schema.prisma, 2026-11-22).
-- Run with: npx prisma migrate deploy
-- PostgreSQL. All additions are nullable or defaulted, so existing rows survive.

ALTER TABLE "Member" ADD COLUMN "dateOfBirth" DATE;

ALTER TABLE "Booking" ADD COLUMN "payMethod" TEXT;
ALTER TABLE "Booking" ADD COLUMN "payState" TEXT DEFAULT 'UNPAID';
ALTER TABLE "Booking" ADD COLUMN "paidAt" TIMESTAMP(3);
CREATE INDEX "Booking_memberId_idx" ON "Booking"("memberId");

ALTER TABLE "Order" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PLACED';
ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMP(3);
CREATE INDEX "Order_memberId_idx" ON "Order"("memberId");

CREATE INDEX "Tab_memberId_idx" ON "Tab"("memberId");

ALTER TABLE "Invoice" ADD COLUMN "taxRate" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "taxAmount" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "memberId" INTEGER;

ALTER TABLE "Payroll" ADD COLUMN "staffId" INTEGER;
-- NOTE: PostgreSQL treats NULLs as distinct in a unique index, so this
-- only binds rows that have a staff member linked (all payrolls created
-- through the API do; older rows with NULL staffId are not constrained).
CREATE UNIQUE INDEX "Payroll_staffId_month_key" ON "Payroll"("staffId", "month");

ALTER TABLE "Product" ADD COLUMN "imageUrl" TEXT;

CREATE TABLE "Leave" (
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
    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Leave_staffId_idx" ON "Leave"("staffId");
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MembershipRenewal" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "payMethod" TEXT NOT NULL,
    "renewedFrom" DATE NOT NULL,
    "renewedTo" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembershipRenewal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MembershipRenewal_memberId_idx" ON "MembershipRenewal"("memberId");
ALTER TABLE "MembershipRenewal" ADD CONSTRAINT "MembershipRenewal_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipRenewal" ADD CONSTRAINT "MembershipRenewal_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
