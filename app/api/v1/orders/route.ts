import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { parse, orderInput } from "@/lib/validate";
import { createOrder, listOrders } from "@/lib/services/sales";

// Placing a pickup order is public: the shop page takes orders from
// anyone. Stock and member discounts are settled by the service, not
// the client. The staff list of today's orders is shop work.
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "SHOP");
    return listOrders();
  });

export const POST = (req: Request) =>
  handle(async () => {
    const input = parse(orderInput, await body(req));
    return createOrder(input);
  }, 201);
