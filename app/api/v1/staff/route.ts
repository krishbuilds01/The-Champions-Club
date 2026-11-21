import { handle } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { listStaff } from "@/lib/services/shifts";

// The staff roster (names and roles only — never credentials).
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    return listStaff();
  });
