import { handle } from "@/lib/http";
import { badRequest } from "@/lib/errors";
import { requireStaff } from "@/lib/auth";
import { markOrderPaid } from "@/lib/services/sales";

// Counter orders taken as PENDING need a way to become PAID once the
// desk takes the money. Staff only; the service flips only PENDING
// orders, so paying twice is impossible.
export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireStaff(req);
    const { id } = await ctx.params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) throw badRequest("Order id is required");
    return markOrderPaid(orderId);
  });
