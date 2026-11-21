import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { parse, invoiceInput } from "@/lib/validate";
import { createInvoice, listInvoices } from "@/lib/services/finance";

// Invoices are the owner's book — only the owner reads or writes them.
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    return listInvoices();
  });

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    return createInvoice(parse(invoiceInput, await body(req)));
  }, 201);
