-- CreateEnum
CREATE TYPE "TabState" AS ENUM ('OPEN', 'SETTLED');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'CONVERTED', 'LOST');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'FRONT_DESK';
ALTER TYPE "Role" ADD VALUE 'BAR';
ALTER TYPE "Role" ADD VALUE 'SHOP';

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "courtPrice",
ADD COLUMN     "cricketPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tennisPrice" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Tab" ADD COLUMN     "memberId" INTEGER,
ADD COLUMN     "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "TabState" NOT NULL DEFAULT 'SETTLED',
ADD COLUMN     "tableNo" INTEGER,
ADD COLUMN     "who" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "subtotal" SET DEFAULT 0,
ALTER COLUMN "total" SET DEFAULT 0,
ALTER COLUMN "payMethod" DROP NOT NULL,
ALTER COLUMN "settledAt" DROP NOT NULL,
ALTER COLUMN "settledAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "interest" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "note" TEXT NOT NULL DEFAULT '',
    "memberId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Enquiry_status_idx" ON "Enquiry"("status");

-- AddForeignKey
ALTER TABLE "Tab" ADD CONSTRAINT "Tab_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

