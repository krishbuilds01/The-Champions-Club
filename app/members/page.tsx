"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import { todayISO } from "@/lib/format";
import type { MemberDTO } from "@/lib/types";

const stateLabel = { active: "Active", expiring: "Expiring soon", expired: "Expired" } as const;

export default function Members() {
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | "active" | "expiring" | "expired">("all");
  const [form, setForm] = useState({ name: "", phone: "", email: "", dob: "", planCode: "silver" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [renewBusy, setRenewBusy] = useState<number | null>(null);
  const members = useApi(() => api.members(), []);
  const plans = useApi(() => api.plans());
  const ql = q.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  // The server search is name-only, so phone and email matching is done here.
  const all = (members.data ?? []).filter(
    (m) =>
      !ql ||
      m.name.toLowerCase().includes(ql) ||
      (m.email ?? "").toLowerCase().includes(ql) ||
      m.phone.includes(q.trim()) ||
      (qDigits.length >= 3 && m.phone.replace(/\D/g, "").includes(qDigits)),
  );
  const list = stateFilter === "all" ? all : all.filter((m) => m.state === stateFilter);

  async function add() {
    if (!form.name.trim()) return setMsg({ ok: false, text: "The member needs a name." });
    if (form.phone && form.phone.replace(/\D/g, "").length < 10)
      return setMsg({ ok: false, text: "That phone number looks short. Check it and try again." });
    if (!form.phone.trim() && !form.email.trim())
      return setMsg({ ok: false, text: "Add a phone number or an email — the member needs a way to sign in." });
    if (form.email.trim() && !form.email.includes("@"))
      return setMsg({ ok: false, text: "That email does not look right. Check it and try again." });
    if (form.planCode === "junior") {
      // Junior is under-18 only. The date of birth is checked here and
      // enforced again on the server, which stores it.
      if (!form.dob) return setMsg({ ok: false, text: "Junior is for under-18s — add a date of birth so the age can be checked." });
      const [by, bm, bd] = form.dob.split("-").map(Number);
      const now = new Date();
      let age = now.getFullYear() - by;
      if (now.getMonth() + 1 < bm || (now.getMonth() + 1 === bm && now.getDate() < bd)) age -= 1;
      if (age >= 18) return setMsg({ ok: false, text: `Junior is for under-18s — this member is ${age}. Pick another plan.` });
    }
    setBusy(true);
    setMsg(null);
    try {
      const m = await api.createMember({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined, planCode: form.planCode, dateOfBirth: form.dob || undefined });
      const plan = plans.data?.find((p) => p.code === form.planCode);
      setMsg({ ok: true, text: `${m.name} added on ${m.plan}. The plan runs ${plan?.termDays ?? 365} days from today.${m.email && form.phone.trim() ? " They can sign in to the member portal with their phone number as the first password." : ""}` });
      setForm({ name: "", phone: "", email: "", dob: "", planCode: "silver" });
      void members.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Adding failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function renew(m: MemberDTO) {
    const base = m.expiresOn > todayISO() ? "the current end date" : "today";
    if (!window.confirm(`Renew ${m.name}'s ${m.plan} plan for another term? The new term runs from ${base}, so no days are lost.`)) return;
    setRenewBusy(m.id);
    setMsg(null);
    try {
      const updated = await api.renewMember(m.id);
      setMsg({ ok: true, text: `${updated.name} renewed — ${updated.plan} now runs until ${updated.expiresOn}.` });
      void members.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Renewal failed. Try again." });
    } finally {
      setRenewBusy(null);
    }
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Front desk</p>
        <h1 className="page-title">Members</h1>
        <p className="sub">Find any member in seconds, and see their plan and where it stands.</p>
      </div>

      <div className="toolbar">
        <div style={{ width: 420, maxWidth: "100%" }}>
          <label htmlFor="m-search">Search members</label>
          <input id="m-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone or email" />
        </div>
        {!members.loading && !members.error && all.length > 0 && (
          <p className="count-line"><b>{list.length}</b> {list.length === 1 ? "member" : "members"}{q ? " found" : ""} · {all.filter((m) => m.state === "active").length} active</p>
        )}
      </div>

      {!members.loading && !members.error && all.length > 0 && (
        <div className="seg" role="group" aria-label="Filter by plan state" style={{ marginTop: 16 }}>
          <button aria-pressed={stateFilter === "all"} onClick={() => setStateFilter("all")}>All</button>
          <button aria-pressed={stateFilter === "active"} onClick={() => setStateFilter("active")}>Active</button>
          <button aria-pressed={stateFilter === "expiring"} onClick={() => setStateFilter("expiring")}>Expiring soon</button>
          <button aria-pressed={stateFilter === "expired"} onClick={() => setStateFilter("expired")}>Expired</button>
        </div>
      )}

      {members.loading ? (
        <div style={{ marginTop: 20 }}><Loading /></div>
      ) : members.error ? (
        <ErrorBox message={members.error} onRetry={members.reload} />
      ) : list.length === 0 ? (
        <div style={{ marginTop: 20 }}>
          <Empty>{q ? <>No member matches &ldquo;{q}&rdquo;. Check the spelling, or add them below.</> : all.length > 0 ? "No members in this state right now." : "No members yet. Add the first one below."}</Empty>
        </div>
      ) : (
        <div className="ledger-wrap">
          <table className="ledger" style={{ marginTop: 12 }}>
            <thead><tr><th>Name</th><th>Plan</th><th className="hide-m">Phone</th><th className="hide-m">Plan ends</th><th>Status</th><th>Renew</th></tr></thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} className={m.state === "expired" ? "row-off" : ""}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td>{m.plan}</td>
                  <td className="num hide-m">{m.phone}</td>
                  <td className="num hide-m">{m.expiresOn}</td>
                  <td><span className={`status ${m.state}`}>{stateLabel[m.state]}</span></td>
                  <td><button className="btn btn-quiet" disabled={renewBusy !== null} onClick={() => renew(m)}>{renewBusy === m.id ? "Renewing..." : "Renew"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="block">
        <div className="sec-head"><h2>Add a member</h2></div>
        <div className="panel panel-main" style={{ maxWidth: 760 }}>
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
              <label htmlFor="m-email">Email (for the member portal)</label>
              <input id="m-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <label htmlFor="m-plan">Plan</label>
              <select id="m-plan" value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value })}>
                {(plans.data ?? []).map((p) => (
                  <option key={p.code} value={p.code}>{p.name} — ₹{p.tennisPrice} tennis / ₹{p.cricketPrice} cricket, {p.termDays} days</option>
                ))}
              </select>
            </div>
            <div><button className="btn btn-ink" onClick={add} disabled={busy}>{busy ? "Adding..." : "Add member"}</button></div>
          </div>
          <div className="field-row" style={{ marginTop: 16 }}>
            <div>
              <label htmlFor="m-dob">Date of birth {form.planCode === "junior" ? "(required for Junior — under 18 only)" : "(needed for Junior)"}</label>
              <input id="m-dob" type="date" value={form.dob} max={todayISO()} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
          </div>
          {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}
        </div>
      </section>
    </main>
  );
}
