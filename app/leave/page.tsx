"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import { todayISO } from "@/lib/format";
import type { LeaveDTO } from "@/lib/types";

const typeLabel = { ANNUAL: "Annual", SICK: "Sick", UNPAID: "Unpaid", OTHER: "Other" } as const;
const statusClass = { PENDING: "expiring", APPROVED: "booked", REJECTED: "cancelled" } as const;

export default function Leave() {
  const me = useApi(() => api.me(), []);
  const roster = useApi(() => api.staffRoster(), []);
  const leaves = useApi(() => api.leaves(), []);
  const isOwner = me.data?.staff.role === "OWNER";
  const [form, setForm] = useState<{ staffId: number; from: string; to: string; type: LeaveDTO["type"]; reason: string }>(
    { staffId: 0, from: todayISO(), to: todayISO(), type: "ANNUAL", reason: "" },
  );
  const [filter, setFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("all");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [decideBusy, setDecideBusy] = useState<number | null>(null);
  // The owner files for anyone on the roster; anyone else files for
  // themselves — their id comes from their own session, not the roster
  // (bar and shop staff cannot load the roster at all).
  const staffId = isOwner ? form.staffId || roster.data?.[0]?.id || 0 : me.data?.staff.id || 0;
  const list = (leaves.data ?? []).filter((l) => filter === "all" || l.status === filter);

  async function submit() {
    if (!staffId) return;
    if (form.to < form.from) return setMsg({ ok: false, text: "The leave cannot end before it starts." });
    setBusy(true);
    setMsg(null);
    try {
      const l = await api.requestLeave({ staffId, from: form.from, to: form.to, type: form.type, reason: form.reason.trim() || undefined });
      setMsg({ ok: true, text: `Leave requested for ${l.staffName}, ${l.fromDate} to ${l.toDate}. The owner will approve it.` });
      setForm({ ...form, reason: "" });
      void leaves.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Saving failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function decide(l: LeaveDTO, status: "APPROVED" | "REJECTED") {
    if (!window.confirm(`${status === "APPROVED" ? "Approve" : "Reject"} ${l.staffName}'s leave, ${l.fromDate} to ${l.toDate}?`)) return;
    setDecideBusy(l.id);
    try {
      await api.decideLeave(l.id, status);
      void leaves.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Saving failed. Try again." });
    } finally {
      setDecideBusy(null);
    }
  }

  const loading = me.loading || leaves.loading || (isOwner && roster.loading);
  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Staff</p>
        <h1 className="page-title">Leave</h1>
        <p className="sub">Time off, requested and approved in one place. Approved leave counts against the month&apos;s pay record.</p>
      </div>

      {loading ? (
        <Loading />
      ) : leaves.error ? (
        <ErrorBox message={leaves.error} onRetry={leaves.reload} />
      ) : isOwner && roster.error ? (
        <ErrorBox message={`Could not load the staff roster: ${roster.error}`} onRetry={roster.reload} />
      ) : (
        <>
          {!isOwner && <p className="muted" style={{ marginBottom: 12 }}>You see your own requests. The owner approves them.</p>}
          {list.length > 0 && (
            <div className="seg" role="group" aria-label="Filter by status" style={{ marginBottom: 16 }}>
              {(["all", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
                <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "PENDING" ? "Pending" : f === "APPROVED" ? "Approved" : "Rejected"}
                </button>
              ))}
            </div>
          )}
          {list.length === 0 ? (
            <Empty>{filter === "all" ? "No leave requests yet." : `No ${filter.toLowerCase()} requests right now.`}</Empty>
          ) : (
            <div className="ledger-wrap">
              <table className="ledger">
                <thead><tr><th>Staff</th><th>From</th><th>To</th><th className="hide-m">Type</th><th className="hide-m">Reason</th><th>Status</th>{isOwner && <th>Decision</th>}</tr></thead>
                <tbody>
                  {list.map((l) => (
                    <tr key={l.id} className={l.status === "REJECTED" ? "row-off" : ""}>
                      <td style={{ fontWeight: 500 }}>{l.staffName}</td>
                      <td className="num">{l.fromDate}</td>
                      <td className="num">{l.toDate}</td>
                      <td className="hide-m">{typeLabel[l.type]}</td>
                      <td className="hide-m">{l.reason || "—"}</td>
                      <td><span className={`status ${statusClass[l.status]}`}>{l.status === "PENDING" ? "Pending" : l.status === "APPROVED" ? "Approved" : "Rejected"}</span></td>
                      {isOwner && (
                        <td>
                          {l.status === "PENDING" ? (
                            <span style={{ display: "inline-flex", gap: 8 }}>
                              <button className="btn btn-quiet" disabled={decideBusy !== null} onClick={() => decide(l, "APPROVED")}>{decideBusy === l.id ? "Saving..." : "Approve"}</button>
                              <button className="btn btn-quiet" disabled={decideBusy !== null} onClick={() => decide(l, "REJECTED")}>Reject</button>
                            </span>
                          ) : (
                            <span className="muted">{l.decidedBy ? `by ${l.decidedBy}` : "—"}</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <section className="block">
            <div className="sec-head"><h2>Request leave</h2></div>
            <div className="panel panel-main" style={{ maxWidth: 760 }}>
              <div className="field-row" style={{ alignItems: "end" }}>
                {isOwner && (
                  <div>
                    <label htmlFor="lv-staff">Staff member</label>
                    <select id="lv-staff" value={staffId} onChange={(e) => setForm({ ...form, staffId: Number(e.target.value) })}>
                      {(roster.data ?? []).map((s) => (
                        <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label htmlFor="lv-from">From</label>
                  <input id="lv-from" type="date" value={form.from} min={todayISO()} onChange={(e) => setForm({ ...form, from: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="lv-to">To</label>
                  <input id="lv-to" type="date" value={form.to} min={form.from} onChange={(e) => setForm({ ...form, to: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="lv-type">Type</label>
                  <select id="lv-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LeaveDTO["type"] })}>
                    {(Object.keys(typeLabel) as LeaveDTO["type"][]).map((t) => (
                      <option key={t} value={t}>{typeLabel[t]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field-row" style={{ marginTop: 16 }}>
                <div>
                  <label htmlFor="lv-reason">Reason (optional)</label>
                  <input id="lv-reason" value={form.reason} maxLength={200} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Holiday, family, unwell..." />
                </div>
              </div>
              {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status" style={{ marginTop: 14 }}>{msg.text}</div>}
              <button className="btn btn-ink" style={{ marginTop: 16 }} disabled={busy || !staffId} onClick={submit}>{busy ? "Requesting..." : "Request leave"}</button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
