import { handle, body } from "@/lib/http";
import { badRequest } from "@/lib/errors";
import { listProducts, createProduct } from "@/lib/services/catalog";
import { parse, productCreateInput } from "@/lib/validate";
import { requireStaff } from "@/lib/auth";

export const GET = (req: Request) =>
  handle(() => {
    const c = new URL(req.url).searchParams.get("category");
    if (c !== null && c !== "GEAR" && c !== "BAR") throw badRequest("Category must be GEAR or BAR");
    return listProducts(c ?? undefined);
  });

export const POST = (req: Request) =>
  handle(async () => {
    await requireStaff(req);
    const input = parse(productCreateInput, await body(req));
    return createProduct(input);
  });
