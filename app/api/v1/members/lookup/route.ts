import { handle } from "@/lib/http";
import { badRequest } from "@/lib/errors";
import { findMemberByName, memberState } from "@/lib/services/members";

// Public and narrow on purpose: the courts and shop pages recognise a
// member by name and show their plan and price. Returns null for
// walk-ins, and never exposes the member list.
export const GET = (req: Request) =>
  handle(async () => {
    const name = new URL(req.url).searchParams.get("name")?.trim();
    if (!name) throw badRequest("name is required");
    const m = await findMemberByName(name);
    if (!m) return { member: null };
    return {
      member: {
        name: m.name,
        plan: m.plan.name,
        planCode: m.plan.code,
        state: memberState(m.expiresOn),
        tennisPrice: m.plan.tennisPrice,
        cricketPrice: m.plan.cricketPrice,
        shopDiscount: m.plan.shopDiscount,
        barDiscount: m.plan.barDiscount,
      },
    };
  });
