import { handle, body } from "@/lib/http";
import { requireMember } from "@/lib/auth";
import { parse, memberBookingInput } from "@/lib/validate";
import { createBooking } from "@/lib/services/bookings";
import { getMember } from "@/lib/services/members";

// A member booking themselves in: the same createBooking service the
// front desk uses, so every rule (court lock, two a day, expired plan,
// plan price) applies exactly the same. Identity comes from the
// session, never from the request body.
export const POST = (req: Request) =>
  handle(async () => {
    const session = await requireMember(req);
    const input = parse(memberBookingInput, await body(req));
    const m = await getMember(session.id);
    return createBooking({ ...input, name: m.name, phone: m.phone, type: "REGULAR" });
  }, 201);
