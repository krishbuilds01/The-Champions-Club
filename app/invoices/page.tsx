"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import { FinanceNav } from "@/components/FinanceNav";
import { inr } from "@/lib/format";

export default function Invoices() {
  const invoices = useApi(() => api.invoices());
  const [form, setForm] = useState({ billedTo: "", detail: "", amount: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const list = invoices.data ?? [];
  const unpaid = list.filter((i) => i.status === "UNPAID");
  const owed = unpaid.reduce((s, i) => s + i.amount, 0);
  const paidTotal = list.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0);

  async function add() {
    const amount = Number(form.amount);
    if (!form.billedTo.trim()) return setMsg({ ok: false, text: "Who is this bill for?" });
    if (!Number.isInteger(amount) || amount <= 0) return setMsg({ ok: false, text: "Add the invoice amount." });
    setBusy(true);
    setMsg(null);
    try {
      await api.createInvoice({ billedTo: form.billedTo.trim(), detail: form.detail.trim(), amount });
      setForm({ billedTo: "", detail: "", amount: "" });
      setMsg({ ok: true, text: "Invoice raised." });
      void invoices.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Saving failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function pay(i: { id: number; billedTo: string; amount: number }) {
    if (!window.confirm(`Mark the invoice for ${i.billedTo} (${inr(i.amount)}) as paid?`)) return;
    setMsg(null);
    setBusyId(i.id);
    try {
      await api.payInvoice(i.id);
      setMsg({ ok: true, text: `Invoice for ${i.billedTo} marked paid, ${inr(i.amount)}.` });
      void invoices.reload();
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
        <h1 className="page-title">Invoices</h1>
        <p className="sub">Bills the club sends out — memberships, corporate clients, events. What is unpaid is what the club is owed.</p>
      </div>

      <FinanceNav active="invoices" />

      {invoices.loading ? (
        <Loading />
      ) : invoices.error ? (
        <ErrorBox message={invoices.error} onRetry={invoices.reload} />
      ) : (
        <>
          <div className="figures">
            <div className="figure"><p className="f-label">Owed to the club</p><p className="f-value num">{inr(owed)}</p></div>
            <div className="figure"><p className="f-label">Unpaid invoices</p><p className="f-value num">{unpaid.length}</p></div>
            <div className="figure"><p className="f-label">Paid so far</p><p className="f-value num">{inr(paidTotal)}</p></div>
          </div>

          {list.length === 0 ? (
            <div style={{ marginTop: 20 }}><Empty>No invoices yet. Raise the first one below.</Empty></div>
          ) : (
            <div className="ledger-wrap" style={{ marginTop: 20 }}>
              <table className="ledger">
                <thead><tr><th>Billed to</th><th className="hide-m">For</th><th className="hide-m">Issued</th><th className="r">Amount</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {list.map((i) => (
                    <tr key={i.id} className={i.status === "PAID" ? "row-off" : ""}>
                      <td style={{ fontWeight: 500 }}>{i.billedTo}</td>
                      <td className="hide-m">{i.detail || "—"}</td>
                      <td className="hide-m num">{i.issuedOn}</td>
                      <td className="r num">{inr(i.amount)}</td>
                      <td><span className={`status ${i.status === "PAID" ? "active" : "expiring"}`}>{i.status === "PAID" ? "Paid" : "Unpaid"}</span></td>
                      <td className="r">{i.status === "UNPAID" && <button className="btn btn-quiet" disabled={busyId === i.id} onClick={() => pay(i)}>{busyId === i.id ? "Paying..." : "Mark paid"}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <section className="block">
            <div className="sec-head"><h2>Raise an invoice</h2></div>
            <div className="panel panel-main" style={{ maxWidth: 760 }}>
              <div className="field-row">
                <div>
                  <label htmlFor="inv-to">Billed to</label>
                  <input id="inv-to" value={form.billedTo} onChange={(e) => setForm({ ...form, billedTo: e.target.value })} placeholder="Member or company name" />
                </div>
                <div>
                  <label htmlFor="inv-amt">Amount ₹</label>
                  <input id="inv-amt" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "") })} inputMode="numeric" />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label htmlFor="inv-detail">For</label>
                <input id="inv-detail" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="Gold plan, one year — or the office league booking" />
              </div>
              {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status" style={{ marginTop: 14 }}>{msg.text}</div>}
              <button className="btn btn-ink" style={{ marginTop: 16 }} disabled={busy} onClick={add}>Raise invoice</button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
