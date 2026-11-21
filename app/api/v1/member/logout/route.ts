import { handle } from "@/lib/http";
import { clearMemberCookie } from "@/lib/auth";

export const POST = () =>
  handle(async () => {
    await clearMemberCookie();
    return { ok: true };
  });
