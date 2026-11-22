"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import { FinanceNav } from "@/components/FinanceNav";
import { inr, todayISO } from "@/lib/format";

export default function Payroll() {
  const payroll = useApi(() => api.payroll());
  const roster = useApi(() => api.staffRoster(), []);
  const [form, setForm] = useState({ staffName: "", month: todayISO().slice(0, 7), salary: "", leaveDays: "0", tax: "0" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [monthFilter, setMonthFilter] = useState("");

  const list = payroll.data ?? [];
  const shown = monthFilter ? list.filter((p) => p.month === monthFilter) : list;
  const monthPrefix = todayISO().slice(0, 7);
  const monthDue = list.filter((p) => p.month === monthPrefix && p.status === "PENDING").reduce((s, p) => s + p.net, 0);

  async function add() {
    const salary = Number(form.salary);
    if (!form.staffName.trim()) return setMsg({ ok: false, text: "Which staff member is this for?" });
    if (!Number.isInteger(salary) || salary <= 0) return setMsg({ ok: false, text: "Add the monthly salary." });
    const leave = Number(form.leaveDays) || 0;
    if (leave < 0 || leave > 30) return setMsg({ ok: false, text: "Leave days must be between 0 and 30." });
    setBusy(true);
    setMsg(null);
    try {
      await api.createPayroll({
        staffName: form.staffName.trim(),
        month: form.month,
        salary,
        leaveDays: leave,
        tax: Number(form.tax) || 0,
      });
      setForm({ staffName: "", month: todayISO().slice(0, 7), salary: "", leaveDays: "0", tax: "0" });
      setMsg({ ok: true, text: "Payroll record added." });
      void payroll.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Saving failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function pay(p: { id: number; staffName: string; net: number }) {
    setMsg(null);
    setBusyId(p.id);
    try {
      await api.payPayroll(p.id);
      setMsg({ ok: true, text: `${p.staffName} paid, ${inr(p.net)}.` });
      void payroll.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Saving failed. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Owner</p>
        <h1 className="page-title">Payroll</h1>
        <p className="sub">One record per person per month: salary, leave taken, tax deducted, and whether it has been paid.</p>
      </div>

      <FinanceNav active="payroll" />

      {payroll.loading ? (
        <Loading />
      ) : payroll.error ? (
        <ErrorBox message={payroll.error} onRetry={payroll.reload} />
      ) : (
        <>
          <div className="figures">
            <div className="figure"><p className="f-label">Still to pay this month</p><p className="f-value num">{inr(monthDue)}</p></div>
            <div className="figure"><p className="f-label">Records</p><p className="f-value num">{list.length}</p></div>
          </div>

          <div className="toolbar" style={{ marginTop: 16 }}>
            <div style={{ width: 200 }}>
              <label htmlFor="pr-filter-month">Show one month</label>
              <input id="pr-filter-month" type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
            </div>
            {monthFilter && (
              <button className="text-link" onClick={() => setMonthFilter("")}>Show all months</button>
            )}
          </div>

          {shown.length === 0 ? (
            <div style={{ marginTop: 20 }}><Empty>{monthFilter ? "No payroll records that month." : "No payroll records yet. Add the first one below."}</Empty></div>
          ) : (
            <div className="ledger-wrap" style={{ marginTop: 20 }}>
              <table className="ledger">
                <thead><tr><th>Staff</th><th>Month</th><th className="hide-m">Leave</th><th className="hide-m r">Salary</th><th className="hide-m r">Tax</th><th className="r">Net pay</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p.id} className={p.status === "PAID" ? "row-off" : ""}>
                      <td style={{ fontWeight: 500 }}>{p.staffName}</td>
                      <td className="num">{p.month}</td>
                      <td className="hide-m num">{p.leaveDays}d</td>
                      <td className="hide-m r num">{inr(p.salary)}</td>
                      <td className="hide-m r num">{inr(p.tax)}</td>
                      <td className="r num">{inr(p.net)}</td>
                      <td><span className={`status ${p.status === "PAID" ? "active" : "expiring"}`}>{p.status === "PAID" ? "Paid" : "Pending"}</span></td>
                      <td className="r">{p.status === "PENDING" && <button className="btn btn-quiet" disabled={busyId === p.id} onClick={() => pay(p)}>{busyId === p.id ? "Paying..." : "Mark paid"}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <section className="block">
            <div className="sec-head"><h2>Add a payroll record</h2></div>
            <div className="panel panel-main" style={{ maxWidth: 760 }}>
              <div className="field-row">
                <div>
                  <label htmlFor="pr-name">Staff member</label>
                  {roster.data && roster.data.length > 0 ? (
                    <select id="pr-name" value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })}>
                      <option value="">Pick staff</option>
                      {roster.data.map((s) => (
                        <option key={s.id} value={s.name}>{s.name} — {s.role}</option>
                      ))}
                    </select>
                  ) : (
                    <input id="pr-name" value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} placeholder="e.g. Neha Sharma" />
                  )}
                </div>
                <div>
                  <label htmlFor="pr-month">Month</label>
                  <input id="pr-month" type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
                </div>
              </div>
              <div className="field-row" style={{ marginTop: 16, alignItems: "end" }}>
                <div>
                  <label htmlFor="pr-salary">Salary ₹</label>
                  <input id="pr-salary" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value.replace(/\D/g, "") })} inputMode="numeric" />
                </div>
                <div>
                  <label htmlFor="pr-tax">Tax deducted ₹</label>
                  <input id="pr-tax" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value.replace(/\D/g, "") })} inputMode="numeric" />
                </div>
                <div>
                  <label htmlFor="pr-leave">Leave days</label>
                  <input id="pr-leave" value={form.leaveDays} onChange={(e) => setForm({ ...form, leaveDays: e.target.value.replace(/\D/g, "") })} inputMode="numeric" />
                </div>
              </div>
              {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status" style={{ marginTop: 14 }}>{msg.text}</div>}
              <button className="btn btn-ink" style={{ marginTop: 16 }} disabled={busy} onClick={add}>Add record</button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
