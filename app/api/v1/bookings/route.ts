import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { parse, bookingInput } from "@/lib/validate";
import { createBooking, listBookings } from "@/lib/services/bookings";

// The booking list is a staff view — bar and shop staff read it too. Trials are public (the website's
// free-trial offer); regular bookings are desk work, so they need a
// signed-in owner or front-desk account — nobody can book as a member
// just by typing their name.
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF", "BAR", "SHOP");
    const params = new URL(req.url).searchParams;
    return listBookings(params.get("date") ?? undefined, params.get("state") ?? undefined);
  });

export const POST = (req: Request) =>
  handle(async () => {
    const input = parse(bookingInput, await body(req));
    if (input.type !== "TRIAL") await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    return createBooking({ ...input, phone: input.phone ?? "" });
  }, 201);
