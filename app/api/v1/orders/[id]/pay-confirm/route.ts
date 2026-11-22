import { handle, body } from "@/lib/http";
import { badRequest } from "@/lib/errors";
import { parse, payConfirmInput } from "@/lib/validate";
import { confirmPayment } from "@/lib/services/sales";

// Public on purpose: the signature Razorpay returns is the proof of
// payment; the service verifies it before marking anything PAID.
export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const { id } = await ctx.params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) throw badRequest("Order id is required");
    const input = parse(payConfirmInput, await body(req));
    return confirmPayment(orderId, input);
  });
