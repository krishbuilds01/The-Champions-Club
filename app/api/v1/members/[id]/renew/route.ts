import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { parse, renewInput } from "@/lib/validate";
import { renewMember } from "@/lib/services/members";

// The front desk renewing a member: the new term starts at the later
// of today and the current expiry, so an early renewal loses no days.
export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Member id is required");
    const input = parse(renewInput, await body(req));
    return renewMember(id, input.payMethod);
  });
