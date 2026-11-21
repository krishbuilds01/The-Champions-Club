import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { parse, enquiryInput } from "@/lib/validate";
import { createEnquiry, listEnquiries } from "@/lib/services/enquiries";

// Anyone can ask the club a question; only the desk works the list.
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    return listEnquiries();
  });

export const POST = (req: Request) =>
  handle(async () => {
    const input = parse(enquiryInput, await body(req));
    return createEnquiry(input);
  }, 201);
