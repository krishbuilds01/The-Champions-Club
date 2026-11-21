import { handle, body } from "@/lib/http";
import { parse, payConfirmInput } from "@/lib/validate";
import { confirmPayment } from "@/lib/services/sales";

// Public on purpose: the signature Razorpay returns is the proof of
// payment; the service verifies it before marking anything PAID.
export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const { id } = await ctx.params;
    const input = parse(payConfirmInput, await body(req));
    return confirmPayment(Number(id), input);
  });
