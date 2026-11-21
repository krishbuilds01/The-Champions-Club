import { handle } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { expiringMembers } from "@/lib/services/members";

// The renewal chase list: members whose plan ends in the next 14 days.
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    return expiringMembers(14);
  });
