import { handle, body } from "@/lib/http";
import { requireMember } from "@/lib/auth";
import { parse, renewInput } from "@/lib/validate";
import { renewMember } from "@/lib/services/members";

// A member renewing their own plan: identity comes from the session,
// never from the request body, and the same renewMember service (and
// the same rules) as the front-desk flow runs.
export const POST = (req: Request) =>
  handle(async () => {
    const session = await requireMember(req);
    const input = parse(renewInput, await body(req));
    return renewMember(session.id, input.payMethod);
  });
