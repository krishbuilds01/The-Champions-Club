import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { parse, convertInput } from "@/lib/validate";
import { convertEnquiry } from "@/lib/services/enquiries";

export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Enquiry id is required");
    const input = parse(convertInput, await body(req));
    return convertEnquiry(id, input.planCode);
  });
