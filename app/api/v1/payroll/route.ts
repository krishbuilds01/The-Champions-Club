import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { parse, payrollInput } from "@/lib/validate";
import { createPayroll, listPayroll } from "@/lib/services/finance";

export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    return listPayroll();
  });

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    return createPayroll(parse(payrollInput, await body(req)));
  }, 201);
