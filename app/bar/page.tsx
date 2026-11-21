"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { inr } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";

const methods = [
  { code: "CASH", label: "Cash" },
  { code: "CARD", label: "Card" },
  { code: "UPI", label: "UPI" },
] as const;

export default function Bar() {
  const menu = useApi(() => api.products("BAR"));
  const plans = useApi(() => api.plans());
  const [tab, setTab] = useState<Record<number, number>>({});
  const [planCode, setPlanCode] = useState<string>("walkin");
  const [payMethod, setPayMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const items = menu.data ?? [];
  const discount = planCode === "walkin" ? 0 : (plans.data?.find((p) => p.code === planCode)?.barDiscount ?? 0);
  const subtotal = items.reduce((s, p) => s + (tab[p.id] ?? 0) * p.price, 0);
  const off = Math.round((subtotal * discount) / 100);
  const set = (id: number, qty: number) => setTab((t) => ({ ...t, [id]: Math.max(0, qty) }));

  async function settle() {
    if (!subtotal) return;
    setBusy(true);
    setMsg(null);
    try {
      const lines = items.filter((p) => (tab[p.id] ?? 0) > 0).map((p) => ({ productId: p.id, qty: tab[p.id] }));
      const r = await api.settleTab({ items: lines, planCode, payMethod });
      setTab({});
      setMsg({ ok: true, text: `Tab settled, ${inr(r.total)} by ${payMethod.toLowerCase()}${r.discount ? `, plan discount ${inr(r.discount)} applied` : ""}.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Settling failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const loading = menu.loading || plans.loading;
  const error = menu.error || plans.error;

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Clubhouse</p>
        <h1 className="page-title">Bar &amp; Café</h1>
        <p className="sub">Open a tab, add as they order, settle before they leave. Pick the member&apos;s plan and the discount applies itself. Staff view.</p>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={() => { void menu.reload(); void plans.reload(); }} />
      ) : items.length === 0 ? (
        <Empty>The bar menu is empty right now.</Empty>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
            <div>
              <label>Member plan</label>
              <div className="seg" role="group" aria-label="Member plan">
                <button aria-pressed={planCode === "walkin"} onClick={() => setPlanCode("walkin")}>Walk-in</button>
                {plans.data!.map((p) => (
                  <button key={p.code} aria-pressed={planCode === p.code} onClick={() => setPlanCode(p.code)}>
                    {p.name}{p.barDiscount ? `, −${p.barDiscount}%` : ""}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Paying by</label>
              <div className="seg" role="group" aria-label="Payment method">
                {methods.map((m) => (
                  <button key={m.code} aria-pressed={payMethod === m.code} onClick={() => setPayMethod(m.code)}>{m.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="rows" style={{ marginTop: 20 }}>
            {items.map((p) => (
              <div className="row-item" key={p.id}>
                <div className="row-main"><p className="row-name">{p.name}</p></div>
                <span className="num" style={{ fontSize: 15 }}>{inr(p.price)}</span>
                <div className="stepper">
                  <button aria-label={`One less ${p.name}`} onClick={() => set(p.id, (tab[p.id] ?? 0) - 1)}>−</button>
                  <b className="num">{tab[p.id] ?? 0}</b>
                  <button aria-label={`One more ${p.name}`} onClick={() => set(p.id, (tab[p.id] ?? 0) + 1)}>+</button>
                </div>
              </div>
            ))}
          </div>

          {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}
          <div className="summary">
            <p className="s-lines">
              Subtotal <span className="num">{inr(subtotal)}</span>
              {discount > 0 && subtotal > 0 ? <> · plan discount <span className="num">−{inr(off)}</span> · </> : " · "}
              <span className="num s-total">{inr(subtotal - off)}</span>
            </p>
            <button className="btn btn-ink" disabled={!subtotal || busy} onClick={settle}>
              {busy ? "Settling..." : subtotal ? `Settle tab, ${inr(subtotal - off)}` : "Tab is empty"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
