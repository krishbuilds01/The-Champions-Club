import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { restockProduct } from "@/lib/services/catalog";

// Stock only goes up here: the shop floor sells it down. Owner and
// shop staff can top a product up and, when given, reset its low-stock
// level at the same time.
export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER", "SHOP");
    const { id } = await ctx.params;
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId <= 0) throw badRequest("Product id must be a whole number");
    const b = (await body(req)) as { qty?: unknown; lowAt?: unknown };
    return restockProduct(productId, b.qty as number, b.lowAt as number | undefined);
  });
