import { handle } from "@/lib/http";
import { razorpayConfigured, razorpayKeyId } from "@/lib/razorpay";

// Tells the shop page whether the pay-online option exists. The key
// id is public (it goes in the checkout page anyway); the secret
// never leaves the server.
export const GET = () =>
  handle(async () => ({ enabled: razorpayConfigured(), keyId: razorpayKeyId() }));
