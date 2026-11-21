import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { parse, memberInput } from "@/lib/validate";
import { createMember, listMembers } from "@/lib/services/members";

export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    return listMembers(new URL(req.url).searchParams.get("q") ?? undefined);
  });

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    const input = parse(memberInput, await body(req));
    return createMember({ ...input, phone: input.phone ?? "" });
  }, 201);
