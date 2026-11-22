-- New bar tabs start OPEN (matches prisma/schema.prisma). openTab always
-- set the status explicitly, so this only aligns the database default.
ALTER TABLE "Tab" ALTER COLUMN "status" SET DEFAULT 'OPEN';
