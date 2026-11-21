import { handle, body } from "@/lib/http";
import { requireMember } from "@/lib/auth";
import { parse, memberOrderInput } from "@/lib/validate";
import { createOrder } from "@/lib/services/sales";
import { getMember } from "@/lib/services/members";

// A member ordering for pickup: the same createOrder service as the
// public shop, so stock and the plan discount behave identically;
// the order lands on their member record.
export const POST = (req: Request) =>
  handle(async () => {
    const session = await requireMember(req);
    const input = parse(memberOrderInput, await body(req));
    const m = await getMember(session.id);
    return createOrder({ ...input, name: m.name, phone: m.phone });
  }, 201);
