-- Run in Prisma Studio on the production database, one statement at a time.
-- Idempotent: safe to re-run. Aligns the live DB with what the deployed
-- code expects (fixes: Member.parentName does not exist).
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "parentName" TEXT;
