import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { parse, staffInput } from "@/lib/validate";
import { createStaff, listStaff } from "@/lib/services/shifts";

// The staff roster (names and roles only — never credentials).
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    return listStaff();
  });

// Only the owner adds staff: a new account can sign in, so this is not
// a front-desk job.
export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const input = parse(staffInput, await body(req));
    return createStaff(input);
  }, 201);
