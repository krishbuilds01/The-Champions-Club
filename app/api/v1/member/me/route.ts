import { handle } from "@/lib/http";
import { requireMember } from "@/lib/auth";
import { memberHome } from "@/lib/services/members";

export const GET = (req: Request) =>
  handle(async () => {
    const session = await requireMember(req);
    return memberHome(session.id);
  });
