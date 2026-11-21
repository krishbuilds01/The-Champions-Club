"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import { FinanceNav } from "@/components/FinanceNav";
import { inr, todayISO } from "@/lib/format";

export default function Payroll() {
  const payroll = useApi(() => api.payroll());
  const [form, setForm] = useState({ staffName: "", month: todayISO().slice(0, 7), salary: "", leaveDays: "0", tax: "0" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const list = payroll.data ?? [];
  const monthPrefix = todayISO().slice(0, 7);
  const monthDue = list.filter((p) => p.month === monthPrefix && p.status === "PENDING").reduce((s, p) => s + p.net, 0);

  async function add() {
    const salary = Number(form.salary);
    if (!form.staffName.trim()) return setMsg({ ok: false, text: "Which staff member is this for?" });
    if (!Number.isInteger(salary) || salary <= 0) return setMsg({ ok: false, text: "Add the monthly salary." });
    setBusy(true);
    setMsg(null);
    try {
      await api.createPayroll({
        staffName: form.staffName.trim(),
        month: form.month,
        salary,
        leaveDays: Number(form.leaveDays) || 0,
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

  async function pay(id: number) {
    setBusy(true);
    try {
      await api.payPayroll(id);
      void payroll.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Saving failed. Try again." });
    } finally {
      setBusy(false);
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

          {list.length === 0 ? (
            <div style={{ marginTop: 20 }}><Empty>No payroll records yet. Add the first one below.</Empty></div>
          ) : (
            <div className="ledger-wrap" style={{ marginTop: 20 }}>
              <table className="ledger">
                <thead><tr><th>Staff</th><th>Month</th><th className="hide-m">Leave</th><th className="hide-m r">Tax</th><th className="r">Net pay</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className={p.status === "PAID" ? "row-off" : ""}>
                      <td style={{ fontWeight: 500 }}>{p.staffName}</td>
                      <td className="num">{p.month}</td>
                      <td className="hide-m num">{p.leaveDays}d</td>
                      <td className="hide-m r num">{inr(p.tax)}</td>
                      <td className="r num">{inr(p.net)}</td>
                      <td><span className={`status ${p.status === "PAID" ? "active" : "expiring"}`}>{p.status === "PAID" ? "Paid" : "Pending"}</span></td>
                      <td className="r">{p.status === "PENDING" && <button className="btn btn-quiet" disabled={busy} onClick={() => pay(p.id)}>Mark paid</button>}</td>
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
                  <label htmlFor="pr-name">Staff name</label>
                  <input id="pr-name" value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} placeholder="e.g. Neha Sharma" />
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
