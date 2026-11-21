import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { parse, enquiryPatchInput } from "@/lib/validate";
import { updateEnquiry } from "@/lib/services/enquiries";

export const PATCH = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Enquiry id is required");
    const input = parse(enquiryPatchInput, await body(req));
    return updateEnquiry(id, input);
  });
