-- Online payments (Razorpay test mode): an ONLINE pay method and a
-- payment state on the order; counter orders stay PAID by default.
ALTER TYPE "PayMethod" ADD VALUE 'ONLINE';
ALTER TABLE "Order" ADD COLUMN "payState" TEXT NOT NULL DEFAULT 'PAID';
ALTER TABLE "Order" ADD COLUMN "razorpayOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN "razorpayPaymentId" TEXT;
