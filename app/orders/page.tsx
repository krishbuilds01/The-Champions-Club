"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import { inr, todayISO } from "@/lib/format";

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Order history: what the shop sold, on which day, and whether the
// money is in. The desk picks a date range; 50 rows a page, newest
// first. A PENDING order gets paid here, once the counter takes it.
export default function OrdersPage() {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [pageNo, setPageNo] = useState(1);
  const orders = useApi(() => api.orders(from, to, pageNo), [from, to, pageNo]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const list = orders.data ?? [];
  const fullPage = list.length === 50;

  function applyRange(f: string, t: string) {
    setFrom(f);
    setTo(t);
    setPageNo(1);
  }

  async function pay(id: number, name: string, total: number) {
    if (!window.confirm(`Mark order #${id} (${name}, ${inr(total)}) as paid?`)) return;
    setBusyId(id);
    setMsg(null);
    try {
      await api.payOrder(id);
      setMsg({ ok: true, text: `Order #${id} marked paid.` });
      void orders.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Saving failed. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Shop</p>
        <h1 className="page-title">Order history</h1>
        <p className="sub">Every pickup order, newest first — what was sold, how it was paid, and what is still owed.</p>
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div>
          <label htmlFor="or-from">From</label>
          <input id="or-from" type="date" value={from} max={todayISO()} onChange={(e) => applyRange(e.target.value, to)} />
        </div>
        <div>
          <label htmlFor="or-to">To</label>
          <input id="or-to" type="date" value={to} min={from} max={todayISO()} onChange={(e) => applyRange(from, e.target.value)} />
        </div>
        <button className="btn btn-quiet" onClick={() => applyRange(todayISO(), todayISO())}>Today</button>
      </div>

      {orders.loading ? (
        <Loading />
      ) : orders.error ? (
        <ErrorBox message={orders.error} onRetry={orders.reload} />
      ) : list.length === 0 ? (
        <Empty>No orders in that range.</Empty>
      ) : (
        <>
          {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status" style={{ marginBottom: 14 }}>{msg.text}</div>}
          <div className="ledger-wrap">
            <table className="ledger">
              <thead><tr><th>Order</th><th>When</th><th>Buyer</th><th className="r">Total</th><th>Method</th><th>Status</th><th>Fulfilment</th><th></th></tr></thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} className={o.payState === "PAID" ? "row-off" : ""}>
                    <td className="num">#{o.id}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtWhen(o.createdAt)}</td>
                    <td style={{ fontWeight: 500 }}>{o.name}</td>
                    <td className="r num">{inr(o.total)}</td>
                    <td>{o.payMethod}</td>
                    <td><span className={`status ${o.payState === "PAID" ? "active" : "expiring"}`}>{o.payState === "PAID" ? "Paid" : "Pending"}</span></td>
                    <td>{o.fulfilment === "DELIVERY" ? "Delivery" : "Pickup"}</td>
                    <td className="r">
                      {o.payState === "PENDING" && (
                        <button className="btn btn-quiet" disabled={busyId === o.id} onClick={() => pay(o.id, o.name, o.total)}>
                          {busyId === o.id ? "Paying..." : "Mark paid"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
            <button className="btn btn-quiet" disabled={pageNo <= 1} onClick={() => setPageNo(pageNo - 1)}>Previous</button>
            <span className="muted">Page {pageNo}</span>
            <button className="btn btn-quiet" disabled={!fullPage} onClick={() => setPageNo(pageNo + 1)}>Next</button>
            {!fullPage && <span className="muted">Last page — fewer than 50 orders here.</span>}
          </div>
        </>
      )}
    </main>
  );
}
