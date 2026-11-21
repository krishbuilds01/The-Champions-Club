"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// The portal's own header strip: who is signed in, and the way out.
export default function MemberBar({ name, plan }: { name: string; plan: string }) {
  const router = useRouter();
  async function out() {
    await api.memberLogout().catch(() => {});
    router.push("/member/login");
    router.refresh();
  }
  return (
    <div className="member-strip" style={{ marginBottom: 18 }}>
      <span>
        Signed in as <strong>{name}</strong> · {plan} member
      </span>
      <button className="mini-link" onClick={out}>Sign out</button>
    </div>
  );
}
