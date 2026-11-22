import { handle } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { removeStaff } from "@/lib/services/shifts";

// Removing a staff member is owner-only, and the service refuses
// anyone with rota, leave or payroll history.
export const DELETE = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Staff id is required");
    return removeStaff(id);
  });
