import { handle } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { markInvoicePaid } from "@/lib/services/finance";

export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Invoice id is required");
    return markInvoicePaid(id);
  });
