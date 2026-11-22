-- Run in Prisma Studio on the production database, one statement at a time.
-- Idempotent: safe to re-run. Aligns the live DB with what the deployed
-- code expects (fixes the "column does not exist" errors from schema drift).
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "parentName" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "parentPhone" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "parentEmail" TEXT;
ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "paymentRef" TEXT;
ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "hourlyRate" INTEGER NOT NULL DEFAULT 250;
CREATE TABLE IF NOT EXISTS "StaffWorkLog" ("id" SERIAL PRIMARY KEY, "staffId" INTEGER NOT NULL REFERENCES "Staff"("id") ON DELETE CASCADE, "clockIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "clockOut" TIMESTAMP(3), "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0, "note" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS "StaffWorkLog_staffId_idx" ON "StaffWorkLog"("staffId");
