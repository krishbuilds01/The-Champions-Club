import { handle, body } from "@/lib/http";
import { requireRole, requireStaff } from "@/lib/auth";
import { parse, leaveInput } from "@/lib/validate";
import { listLeaves, requestLeave } from "@/lib/services/leave";

// Leave requests: the owner sees every request; anyone else sees only
// their own. Anyone on staff can file a request (the desk files for
// people too); only the owner decides, on PATCH /leave/[id].
export const GET = (req: Request) =>
  handle(async () => {
    const staff = await requireStaff(req);
    return listLeaves(staff.role === "OWNER" ? undefined : staff.id);
  });

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF", "BAR", "SHOP");
    const input = parse(leaveInput, await body(req));
    return requestLeave(input);
  }, 201);
