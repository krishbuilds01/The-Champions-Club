import { handle, body } from "@/lib/http";
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
    if (!isISODate(from) || !isISODate(to)) return listShifts("0000-01-01", "9999-12-31");
    return listShifts(from, to);
  });

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK");
    return assignShift(parse(shiftInput, await body(req)));
  }, 201);
