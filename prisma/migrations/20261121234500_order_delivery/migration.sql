-- Shop delivery: an order is picked up or delivered to an address.
ALTER TABLE "Order" ADD COLUMN "fulfilment" TEXT NOT NULL DEFAULT 'PICKUP';
ALTER TABLE "Order" ADD COLUMN "address" TEXT;
