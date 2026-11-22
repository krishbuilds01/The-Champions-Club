import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { parse, tabOpenInput } from "@/lib/validate";
import { listTabs, openTab } from "@/lib/services/sales";

// The bar till is bar work: only the owner and bar staff run tabs.
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "BAR", "FRONT_DESK");
    return listTabs();
  });

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "BAR");
    const input = parse(tabOpenInput, await body(req));
    return openTab(input);
  }, 201);
