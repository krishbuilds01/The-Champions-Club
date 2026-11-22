import { createHmac, timingSafeEqual } from "crypto";
import { badRequest } from "./errors";

// Razorpay in TEST mode. Keys come from the environment
// (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET); without them the online
// option simply does not appear and counter payments carry on.
// No SDK — the two calls we need are plain REST + an HMAC check.
const keyId = () => process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = () => process.env.RAZORPAY_KEY_SECRET?.trim();

export const razorpayConfigured = () => Boolean(keyId() && keySecret());
export const razorpayKeyId = () => keyId() ?? null;

export async function createRazorpayOrder(orderId: number, amountInr: number): Promise<string> {
  let res: Response;
  try {
    res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64"),
      },
      body: JSON.stringify({ amount: amountInr * 100, currency: "INR", receipt: `order_${orderId}` }),
    });
  } catch {
    throw badRequest("Online payment could not be started. Pay at the counter instead.");
  }
  if (!res.ok) throw badRequest("Online payment could not be started. Pay at the counter instead.");
  const data = (await res.json()) as { id: string };
  return data.id;
}

export function verifyPaymentSignature(razorpayOrderId: string, paymentId: string, signature: string): boolean {
  const secret = keySecret();
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${razorpayOrderId}|${paymentId}`).digest();
  // Compare in constant time, on equal-length buffers: a plain ===
  // on hex strings leaks how many leading characters matched.
  const given = Buffer.from(signature, "hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(expected, given);
}
