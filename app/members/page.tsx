"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";

const stateLabel = { active: "Active", expiring: "Expiring soon", expired: "Expired" } as const;

export default function Members() {
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", planCode: "silver" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const members = useApi(() => api.members(q || undefined), [q]);
  const plans = useApi(() => api.plans());
  const list = members.data ?? [];

  async function add() {
    if (!form.name.trim()) return setMsg({ ok: false, text: "The member needs a name." });
    if (form.phone && form.phone.replace(/\D/g, "").length < 10)
      return setMsg({ ok: false, text: "That phone number looks short. Check it and try again." });
    setBusy(true);
    setMsg(null);
    try {
      const m = await api.createMember({ name: form.name.trim(), phone: form.phone.trim(), planCode: form.planCode });
      const plan = plans.data?.find((p) => p.code === form.planCode);
      setMsg({ ok: true, text: `${m.name} added on ${m.plan}. The plan runs ${plan?.termDays ?? 365} days from today.` });
      setForm({ name: "", phone: "", planCode: "silver" });
      void members.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Adding failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Front desk</p>
        <h1 className="page-title">Members</h1>
        <p className="sub">Find any member in seconds, and see their plan and where it stands. Staff view.</p>
      </div>

      <div style={{ maxWidth: 420 }}>
        <label htmlFor="m-search">Search members</label>
        <input id="m-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" />
      </div>

      {members.loading ? (
        <div style={{ marginTop: 20 }}><Loading /></div>
      ) : members.error ? (
        <ErrorBox message={members.error} onRetry={members.reload} />
      ) : list.length === 0 ? (
        <div style={{ marginTop: 20 }}>
          <Empty>{q ? <>No member matches &ldquo;{q}&rdquo;. Check the spelling, or add them below.</> : "No members yet. Add the first one below."}</Empty>
        </div>
      ) : (
        <div className="ledger-wrap">
          <table className="ledger" style={{ marginTop: 12 }}>
            <thead><tr><th>Name</th><th>Plan</th><th className="hide-m">Plan ends</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td>{m.plan}</td>
                  <td className="num hide-m">{m.expiresOn}</td>
                  <td><span className={`status ${m.state}`}>{stateLabel[m.state]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="block">
        <div className="sec-head"><h2>Add a member</h2></div>
        <div className="panel" style={{ maxWidth: 760 }}>
          <div className="field-row">
            <div>
              <label htmlFor="m-name">Name</label>
              <input id="m-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="m-phone">Phone</label>
              <input id="m-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
            </div>
          </div>
          <div className="field-row" style={{ marginTop: 16, alignItems: "end" }}>
            <div>
              <label htmlFor="m-plan">Plan</label>
              <select id="m-plan" value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value })}>
                {(plans.data ?? []).map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>
            <div><button className="btn btn-ink" onClick={add} disabled={busy}>{busy ? "Adding..." : "Add member"}</button></div>
          </div>
          {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}
        </div>
      </section>
    </main>
  );
}
