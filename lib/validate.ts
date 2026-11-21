import { z } from "zod";
import { badRequest } from "./errors";
import { isISODate } from "./format";
import { isISODate } from "./format";
import { isISODate } from "./format";

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
  type: z.enum(["REGULAR", "TRIAL", "FRIDAY_SOCIAL"]).optional().default("REGULAR"),
});

export const trialInput = bookingInput.extend({
  phone: phone,
  type: z.enum(["TRIAL"]).optional().default("TRIAL"),
});

export const memberBookingInput = bookingInput
  .pick({ courtId: true, date: true, start: true })
  .extend({ type: z.enum(["REGULAR", "FRIDAY_SOCIAL"]).optional().default("REGULAR") });

export const memberLoginInput = z.object({
  email: z.string().trim().email("That email does not look right").max(120),
  password: z.string().min(1, "Add your password").max(200),
});

export const memberInput = z.object({
  name: z.string().trim().min(1, "The member needs a name").max(80),
  phone: z.string().trim().max(20).optional().default(""),
  email: z.string().trim().email("That email does not look right").max(120).optional(),
  planCode: z.string().min(1),
  // Real calendar date (Feb 30 is rejected by isISODate); Junior is
  // under-18 only, enforced in the service, not just the page.
  dateOfBirth: z
    .string()
    .refine((d) => isISODate(d), "That date of birth is not a real date")
    .optional(),
});

export const itemsInput = z
  .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(99) }))
  .min(1, "Nothing in the order yet");

export const orderInput = z.object({
  items: itemsInput,
  name: z.string().trim().min(1, "Your name is missing").max(80),
  phone: phone,
  payMethod: z.enum(["CASH", "CARD", "UPI"]),
  fulfilment: z.enum(["PICKUP", "DELIVERY"]).optional().default("PICKUP"),
  address: z.string().trim().max(300).optional(),
  payOnline: z.boolean().optional().default(false),
});

export const memberOrderInput = orderInput.pick({ items: true, payMethod: true, fulfilment: true, address: true, payOnline: true });

export const invoiceInput = z.object({
  billedTo: z.string().trim().min(2, "Who is this bill for?").max(80),
  detail: z.string().trim().max(200).optional().default(""),
  amount: z.number().int().positive("The invoice needs an amount").max(100000000),
  // Optional tax percent; the service computes the tax amount from it.
  taxRate: z.number().int().min(0).max(100).optional(),
});

export const expenseInput = z.object({
  title: z.string().trim().min(2, "What was this for?").max(80),
  category: z.enum(["Rent", "Utilities", "Supplies", "Maintenance", "Other"]).optional().default("Other"),
  amount: z.number().int().positive("The expense needs an amount").max(100000000),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  note: z.string().trim().max(200).optional().default(""),
});

export const payrollInput = z.object({
  staffName: z.string().trim().min(2, "Which staff member?").max(80),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
  salary: z.number().int().positive("Salary is missing").max(100000000),
  leaveDays: z.number().int().min(0).max(31).optional().default(0),
  tax: z.number().int().min(0).max(100000000).optional().default(0),
});

export const leaveInput = z.object({
  staffId: z.number().int().positive(),
  from: z.string().refine((d) => isISODate(d), "That start date is not a real date"),
  to: z.string().refine((d) => isISODate(d), "That end date is not a real date"),
  type: z.enum(["ANNUAL", "SICK", "UNPAID", "OTHER"]).optional().default("ANNUAL"),
  reason: z.string().trim().max(200).optional().default(""),
});

export const leaveDecisionInput = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const shiftInput = z.object({
  staffId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  part: z.enum(["MORNING", "EVENING"]),
});

export const payConfirmInput = z.object({
  razorpayOrderId: z.string().min(1).max(80),
  paymentId: z.string().min(1).max(80),
  signature: z.string().min(1).max(200),
});

export const tabOpenInput = z.object({
  who: z.string().trim().min(1, "The tab needs a name").max(80),
  tableNo: z.number().int().min(1).max(8).optional(),
});

export const tabItemsInput = z.object({ items: itemsInput });

export const tabSettleInput = z.object({
  payMethod: z.enum(["CASH", "CARD", "UPI"]),
});

export const enquiryInput = z.object({
  name: z.string().trim().min(2, "Your name is missing").max(80),
  contact: z
    .string()
    .trim()
    .min(3, "Add a phone number or email")
    .max(80)
    .refine(
      (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || s.replace(/\D/g, "").length >= 10,
      "Add a valid email or a 10-digit phone number",
    ),
  interest: z.enum(["Membership", "Free trial", "Courts", "Shop", "Other"]),
  message: z.string().trim().max(500).optional().default(""),
});

export const enquiryPatchInput = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUOTED", "CONVERTED", "LOST"]).optional(),
  note: z.string().trim().max(500).optional(),
});

export const convertInput = z.object({ planCode: z.string().min(1) });

export const quoteInput = z.object({
  planCode: z.string().min(1),
  amount: z.number().int().positive("The quote needs an amount").max(10000000),
  note: z.string().trim().max(300).optional().default(""),
});

export const staffInput = z.object({
  name: z.string().trim().min(2, "The staff member needs a name").max(80),
  email: z.string().trim().email("That email does not look right").max(120),
  password: z.string().min(8, "Password needs at least 8 characters").max(200),
  role: z.enum(["OWNER", "STAFF", "FRONT_DESK", "BAR", "SHOP"]),
});

export const loginInput = z.object({
  email: z.string().trim().email("That email does not look right"),
  password: z.string().min(1, "Password is missing"),
});

