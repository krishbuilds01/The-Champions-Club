import { z } from "zod";
import { badRequest } from "./errors";

// Every API input is parsed here, in one place. Handlers never read raw
// request bodies.
export const parse = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const r = schema.safeParse(data);
  if (!r.success) throw badRequest(r.error.issues[0]?.message ?? "Invalid input");
  return r.data;
};

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
const phone = z
  .string()
  .trim()
  .refine((s) => s.replace(/\D/g, "").length >= 10, "Add a phone number with at least 10 digits");

export const bookingInput = z.object({
  courtId: z.number().int().positive(),
  date: dateStr,
  start: z.number().int(),
  name: z.string().trim().min(1, "Your name is missing").max(80),
  phone: z.string().trim().max(20).optional().default(""),
  type: z.enum(["REGULAR", "TRIAL"]).optional().default("REGULAR"),
});

export const trialInput = bookingInput.extend({
  phone: phone,
  type: z.enum(["TRIAL"]).optional().default("TRIAL"),
});

export const memberInput = z.object({
  name: z.string().trim().min(1, "The member needs a name").max(80),
  phone: z.string().trim().max(20).optional().default(""),
  planCode: z.string().min(1),
});

export const itemsInput = z
  .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(99) }))
  .min(1, "Nothing in the order yet");

export const orderInput = z.object({
  items: itemsInput,
  memberName: z.string().trim().max(80).optional().default(""),
  payMethod: z.enum(["CASH", "CARD", "UPI"]),
});

export const tabInput = z.object({
  items: itemsInput,
  planCode: z.string().min(1), // a plan code, or "walkin"
  payMethod: z.enum(["CASH", "CARD", "UPI"]),
});

export const loginInput = z.object({
  email: z.string().trim().email("That email does not look right"),
  password: z.string().min(1, "Password is missing"),
});

export const pinInput = z.object({
  pin: z.string().regex(/^\d{4}$/, "PIN is 4 digits"),
});

export const adjustStockInput = z.object({
  productId: z.number().int().positive(),
  delta: z.number().int(),
});

export const productCreateInput = z.object({
  name: z.string().trim().min(1, "Product name is required").max(80),
  price: z.number().int().positive("Price must be greater than zero"),
  stock: z.number().int().min(0).optional().default(0),
  lowAt: z.number().int().min(0).optional().default(5),
  category: z.enum(["GEAR", "BAR"]),
});
