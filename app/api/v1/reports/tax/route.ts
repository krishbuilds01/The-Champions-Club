import { handle } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { taxSummary } from "@/lib/services/reports";

// Owner only: tax is the owner's numbers. No dates means the current
// month; a half-open window falls back to it too (see the service).
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const q = new URL(req.url).searchParams;
    return taxSummary({ from: q.get("from") ?? undefined, to: q.get("to") ?? undefined });
  });
