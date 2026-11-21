import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { parse, expenseInput } from "@/lib/validate";
import { createExpense, listExpenses } from "@/lib/services/finance";

export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    return listExpenses();
  });

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    return createExpense(parse(expenseInput, await body(req)));
  }, 201);
