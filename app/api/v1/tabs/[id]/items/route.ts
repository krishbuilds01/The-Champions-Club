import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { parse, tabItemsInput } from "@/lib/validate";
import { addTabItems } from "@/lib/services/sales";

export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER", "BAR");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Tab id is required");
    const input = parse(tabItemsInput, await body(req));
    return addTabItems(id, input.items);
  });
