import { handle, body } from "@/lib/http";
import { memberLogin, setMemberCookie } from "@/lib/auth";
import { parse, memberLoginInput } from "@/lib/validate";

export const POST = (req: Request) =>
  handle(async () => {
    const input = parse(memberLoginInput, await body(req));
    const { member, token } = await memberLogin(input.email, input.password);
    await setMemberCookie(token);
    return { member, token };
  });
