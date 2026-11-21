-- Enquiry quotes: the priced offer staff sent, recorded on the enquiry.
ALTER TABLE "Enquiry" ADD COLUMN "quotePlan" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN "quoteAmount" INTEGER;
ALTER TABLE "Enquiry" ADD COLUMN "quoteNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Enquiry" ADD COLUMN "quotedAt" TIMESTAMP(3);
