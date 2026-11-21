import { handle } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { cancelBooking } from "@/lib/services/bookings";

export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Booking id is required");
    return cancelBooking(id);
  });
