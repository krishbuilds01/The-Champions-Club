import { handle, body } from "@/lib/http";
import { currentStaff, toggleStaffClock } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";

export const POST = (req: Request) =>
  handle(async () => {
    const staff = await currentStaff();
    if (!staff) throw unauthorized("Must be signed in as staff");
    const data = (await body(req).catch(() => ({}))) as { staffId?: number | string };
    const targetStaffId = data?.staffId ? Number(data.staffId) : staff.id;
    return await toggleStaffClock(targetStaffId);
  });
