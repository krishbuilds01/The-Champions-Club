"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import { FinanceNav } from "@/components/FinanceNav";
import { inr, todayISO } from "@/lib/format";

const categories = ["Rent", "Utilities", "Supplies", "Maintenance", "Other"] as const;

export default function Expenses() {
  const expenses = useApi(() => api.expenses());
  const dash = useApi(() => api.dashboard());
  const [form, setForm] = useState({ title: "", category: "Other", amount: "", spentOn: todayISO(), note: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const list = expenses.data ?? [];
  const monthPrefix = todayISO().slice(0, 7);
  const monthOut = list.filter((e) => e.spentOn.startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0);
  // "Taken in" and "Spent" now share one window, the calendar month.
  // Note: this figure is the dashboard's month total; a true calendar-
  // month income figure needs a dashboard API change (another agent).
  const monthIn = dash.data?.periods.month.total ?? null;

  async function add() {
    const amount = Number(form.amount);
    if (!form.title.trim()) return setMsg({ ok: false, text: "What was this expense for?" });
    if (!Number.isFinite(amount) || amount <= 0) return setMsg({ ok: false, text: "Add the amount spent." });
    setBusy(true);
    setMsg(null);
    try {
      await api.createExpense({ title: form.title.trim(), category: form.category, amount, spentOn: form.spentOn, note: form.note.trim() });
      setForm({ title: "", category: "Other", amount: "", spentOn: todayISO(), note: "" });
      setMsg({ ok: true, text: "Expense recorded." });
      void expenses.reload();
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
        <h1 className="page-title">Expenses</h1>
        <p className="sub">What the club spends — rent, lights, stock, repairs. This month&apos;s spending against this month&apos;s takings.</p>
      </div>

      <FinanceNav active="expenses" />

      {expenses.loading ? (
        <Loading />
      ) : expenses.error ? (
        <ErrorBox message={expenses.error} onRetry={expenses.reload} />
      ) : (
        <>
          <div className="figures">
            <div className="figure"><p className="f-label">Spent this month</p><p className="f-value num">{inr(monthOut)}</p></div>
            <div className="figure"><p className="f-label">Taken in this month</p><p className="f-value num">{monthIn === null ? "—" : inr(monthIn)}</p></div>
            <div className="figure"><p className="f-label">Difference</p><p className="f-value num">{monthIn === null ? "—" : inr(monthIn - monthOut)}</p></div>
          </div>

          {list.length === 0 ? (
            <div style={{ marginTop: 20 }}><Empty>No expenses recorded yet. Add the first one below.</Empty></div>
          ) : (
            <div className="ledger-wrap" style={{ marginTop: 20 }}>
              <table className="ledger">
                <thead><tr><th>What</th><th className="hide-m">Category</th><th>Date</th><th className="r">Amount</th></tr></thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500 }}>{e.title}{e.note ? <span className="muted"> — {e.note}</span> : null}</td>
                      <td className="hide-m">{e.category}</td>
                      <td className="num">{e.spentOn}</td>
                      <td className="r num">{inr(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <section className="block">
            <div className="sec-head"><h2>Add an expense</h2></div>
            <div className="panel panel-main" style={{ maxWidth: 760 }}>
              <div className="field-row">
                <div>
                  <label htmlFor="ex-title">What for</label>
                  <input id="ex-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Court rent, electricity bill, ball stock" />
                </div>
                <div>
                  <label htmlFor="ex-amt">Amount ₹</label>
                  <input id="ex-amt" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9.]/g, "") })} inputMode="decimal" placeholder="e.g. 1250.50" />
                </div>
              </div>
              <div className="field-row" style={{ marginTop: 16, alignItems: "end" }}>
                <div>
                  <label htmlFor="ex-cat">Category</label>
                  <select id="ex-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="ex-date">Date</label>
                  <input id="ex-date" type="date" value={form.spentOn} max={todayISO()} onChange={(e) => setForm({ ...form, spentOn: e.target.value })} />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label htmlFor="ex-note">Note</label>
                <input id="ex-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional" />
              </div>
              {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status" style={{ marginTop: 14 }}>{msg.text}</div>}
              <button className="btn btn-ink" style={{ marginTop: 16 }} disabled={busy} onClick={add}>Add expense</button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
