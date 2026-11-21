import { handle, body } from "@/lib/http";
import { parse, adjustStockInput } from "@/lib/validate";
import { adjustProductStock } from "@/lib/services/catalog";
import { requireStaff } from "@/lib/auth";

export const POST = (req: Request) =>
  handle(async () => {
    await requireStaff(req);
    const input = parse(adjustStockInput, await body(req));
    return adjustProductStock(input.productId, input.delta);
  });
