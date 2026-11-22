import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { parse, leaveDecisionInput } from "@/lib/validate";
import { decideLeave } from "@/lib/services/leave";

// Only the owner approves or rejects leave, and only while it is still
// pending — the service flips it atomically, so a double decision is a
// conflict, not a second record.
export const PATCH = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const staff = await requireRole(req, "OWNER");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Leave id is required");
    const input = parse(leaveDecisionInput, await body(req));
    return decideLeave(id, input.status, staff.name);
  });
