import { handle, body } from "@/lib/http";
import { badRequest } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { isISODate } from "@/lib/format";
import { parse, shiftInput } from "@/lib/validate";
import { assignShift, listShifts } from "@/lib/services/shifts";

export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    if (!isISODate(from) || !isISODate(to)) throw badRequest("from and to must be YYYY-MM-DD dates");
    if (from > to) throw badRequest("from must not be after to");
    return listShifts(from, to);
  });

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK");
    return assignShift(parse(shiftInput, await body(req)));
  }, 201);
