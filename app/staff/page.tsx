"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import type { StaffDTO } from "@/lib/types";

const ROLES: StaffDTO["role"][] = ["OWNER", "FRONT_DESK", "STAFF", "BAR", "SHOP"];

// Staff management is owner-only: only the owner creates sign-in
// accounts, and only the owner removes them. Anyone else sees that
// plainly instead of a broken form.
export default function StaffPage() {
  const me = useApi(() => api.me(), []);
  const roster = useApi(() => api.staffRoster(), []);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" as StaffDTO["role"] });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const isOwner = me.data?.staff.role === "OWNER";
  const list = roster.data ?? [];

  async function add() {
    if (!form.name.trim()) return setMsg({ ok: false, text: "The staff member needs a name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return setMsg({ ok: false, text: "That email does not look right." });
    if (form.password.length < 8)
      return setMsg({ ok: false, text: "Password needs at least 8 characters." });
    setBusy(true);
    setMsg(null);
    try {
      await api.createStaff({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setForm({ name: "", email: "", password: "", role: "STAFF" });
      setMsg({ ok: true, text: `${form.name.trim()} can now sign in with that email and password.` });
      void roster.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Saving failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number, name: string) {
    if (!window.confirm(`Remove ${name} from the staff? Their sign-in stops working.`)) return;
    setBusyId(id);
    setMsg(null);
    try {
      await api.removeStaff(id);
      setMsg({ ok: true, text: `${name} removed.` });
      void roster.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Removing failed. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Owner</p>
        <h1 className="page-title">Staff</h1>
        <p className="sub">Who can sign in, and with which role. New accounts sign in with the email and password you set here.</p>
      </div>

      {me.loading || roster.loading ? (
        <Loading />
      ) : me.error || roster.error ? (
        <ErrorBox message={me.error || roster.error} onRetry={() => { void me.reload(); void roster.reload(); }} />
      ) : !isOwner ? (
        <ErrorBox message="Staff management is for the owner." onRetry={me.reload} />
      ) : (
        <>
          {list.length === 0 ? (
            <Empty>No staff on record yet. Add the first one below.</Empty>
          ) : (
            <div className="ledger-wrap">
              <table className="ledger">
                <thead><tr><th>Name</th><th>Role</th><th></th></tr></thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td>{s.role}</td>
                      <td className="r">
                        <button className="btn btn-quiet" disabled={busyId === s.id} onClick={() => remove(s.id, s.name)}>
                          {busyId === s.id ? "Removing..." : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <section className="block">
            <div className="sec-head"><h2>Add a staff member</h2></div>
            <div className="panel panel-main" style={{ maxWidth: 760 }}>
              <div className="field-row">
                <div>
                  <label htmlFor="st-name">Name</label>
                  <input id="st-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Neha Sharma" />
                </div>
                <div>
                  <label htmlFor="st-email">Email (sign-in)</label>
                  <input id="st-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@champions.club" />
                </div>
              </div>
              <div className="field-row" style={{ marginTop: 16, alignItems: "end" }}>
                <div>
                  <label htmlFor="st-pass">Password</label>
                  <input id="st-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" autoComplete="new-password" />
                </div>
                <div>
                  <label htmlFor="st-role">Role</label>
                  <select id="st-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffDTO["role"] })}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status" style={{ marginTop: 14 }}>{msg.text}</div>}
              <button className="btn btn-ink" style={{ marginTop: 16 }} disabled={busy} onClick={add}>Add staff member</button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
