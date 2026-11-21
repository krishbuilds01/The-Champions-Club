import { handle } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { removeShift } from "@/lib/services/shifts";

export const DELETE = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Shift id is required");
    return removeShift(id);
  });
