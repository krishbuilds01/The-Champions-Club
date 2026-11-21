"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { inr } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";
import type { TabDTO } from "@/lib/types";

const methods = [
  { code: "CASH", label: "Cash" },
  { code: "CARD", label: "Card" },
  { code: "UPI", label: "UPI" },
] as const;

export default function Bar() {
  const menu = useApi(() => api.products("BAR"));
  const plans = useApi(() => api.plans());
  const [tabs, setTabs] = useState<TabDTO[] | null>(null);
  const [tabsErr, setTabsErr] = useState("");
  const [who, setWho] = useState("");
  const [tableNo, setTableNo] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [payMethod, setPayMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const items = menu.data ?? [];
  const open = (tabs ?? []).filter((t) => t.status === "OPEN");
  const settled = (tabs ?? []).filter((t) => t.status === "SETTLED");
  const tab = open.find((t) => t.id === selected) ?? open[0] ?? null;
  const plan = plans.data?.find((p) => p.code === tab?.planCode);
  const draftTotal = items.reduce((s, p) => s + (draft[p.id] ?? 0) * p.price, 0);
  const set = (id: number, qty: number) => setDraft((t) => ({ ...t, [id]: Math.max(0, qty) }));

  async function loadTabs() {
    try {
      const t = await api.tabs();
      setTabs(t);
      setTabsErr("");
    } catch (e) {
      setTabsErr(e instanceof ApiClientError ? e.message : "Could not load tabs.");
    }
  }
  useEffect(() => {
    void loadTabs();
  }, []);

  async function openNew() {
    if (!who.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const t = await api.openTab({ who: who.trim(), tableNo: tableNo ? Number(tableNo) : undefined });
      setWho("");
      setTableNo("");
      setSelected(t.id);
      setMsg({ ok: true, text: `Tab open for ${t.who}${t.tableNo ? `, table ${t.tableNo}` : ""}.` });
      await loadTabs();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Could not open the tab." });
    } finally {
      setBusy(false);
    }
  }

  async function addDraft() {
    if (!tab || !draftTotal) return;
    setBusy(true);
    setMsg(null);
    try {
      const lines = items.filter((p) => (draft[p.id] ?? 0) > 0).map((p) => ({ productId: p.id, qty: draft[p.id] }));
      const t = await api.addTabItems(tab.id, lines);
      setDraft({});
      setMsg({ ok: true, text: `Added. ${t.who}'s tab is at ${inr(t.subtotal)}.` });
      await loadTabs();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Could not add those items." });
    } finally {
      setBusy(false);
    }
  }

  async function settle() {
    if (!tab) return;
    setBusy(true);
    setMsg(null);
    try {
      const t = await api.settleTab(tab.id, payMethod);
      const off = t.subtotal - t.total;
      setMsg({
        ok: true,
        text: `Settled ${t.who}'s tab, ${inr(t.total)} by ${payMethod.toLowerCase()}${off ? `, plan discount ${inr(off)} applied` : ""}.`,
      });
      setSelected(null);
      await loadTabs();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Settling failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Clubhouse</p>
        <h1 className="page-title">Bar &amp; Café</h1>
        <p className="sub">Open a tab, add as they order, settle before they leave. The member&apos;s plan discount applies itself at settle.</p>
      </div>

      {menu.loading ? (
        <Loading />
      ) : menu.error ? (
        <ErrorBox message={menu.error} onRetry={menu.reload} />
      ) : items.length === 0 ? (
        <Empty>The bar menu is empty right now.</Empty>
      ) : tabsErr ? (
        <>
          <div className="notice err" role="alert">
            The till is for bar staff. <Link className="text-link" href="/login">Sign in</Link> to run tabs.
          </div>
          <div className="rows" style={{ marginTop: 20 }}>
            {items.map((p) => (
              <div className="row-item" key={p.id}>
                <div className="row-main"><p className="row-name">{p.name}</p></div>
                <span className="num" style={{ fontSize: 15 }}>{inr(p.price)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="panel panel-main">
          <div className="bar-open-grid" style={{ maxWidth: 640 }}>
            <div>
              <label htmlFor="b-who">Open a tab for</label>
              <input id="b-who" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Member or guest name" />
            </div>
            <div>
              <label htmlFor="b-table">Table</label>
              <input id="b-table" value={tableNo} onChange={(e) => setTableNo(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="No." />
            </div>
            <button className="btn btn-ink" disabled={!who.trim() || busy} onClick={openNew}>Open tab</button>
          </div>

          {open.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <label>Open tabs</label>
              <div className="seg" role="group" aria-label="Open tabs">
                {open.map((t) => (
                  <button key={t.id} aria-pressed={tab?.id === t.id} onClick={() => setSelected(t.id)}>
                    {t.who}{t.tableNo ? ` · T${t.tableNo}` : ""} · <span className="num">{inr(t.subtotal)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>

          {tab ? (
            <>
              <div className="panel panel-main" style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
                  <p style={{ fontWeight: 600 }}>
                    {tab.who}
                    {tab.tableNo ? `, table ${tab.tableNo}` : ""}
                    {plan ? `, ${plan.name} plan${plan.barDiscount ? `, ${plan.barDiscount}% off at settle` : ""}` : ", walk-in"}
                  </p>
                  <span className="s-price num">{inr(tab.subtotal)}</span>
                </div>
                {tab.items.length > 0 ? (
                  <div className="rows" style={{ marginTop: 10 }}>
                    {tab.items.map((i) => (
                      <div className="row-item" key={i.productId}>
                        <div className="row-main"><p className="row-name">{i.qty} × {i.name}</p></div>
                        <span className="num">{inr(i.qty * i.price)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted" style={{ marginTop: 8 }}>Nothing on this tab yet. Add from the menu below.</p>
                )}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "end", marginTop: 16 }}>
                  <div>
                    <label>Paying by</label>
                    <div className="seg" role="group" aria-label="Payment method">
                      {methods.map((m) => (
                        <button key={m.code} aria-pressed={payMethod === m.code} onClick={() => setPayMethod(m.code)}>{m.label}</button>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-ink" disabled={busy || tab.items.length === 0} onClick={settle}>
                    {busy ? "Settling..." : tab.items.length === 0 ? "No items on tab" : `Settle tab, ${inr(tab.subtotal)}`}
                  </button>
                </div>
              </div>

              <div className="rows" style={{ marginTop: 20 }}>
                {items.map((p) => (
                  <div className="row-item" key={p.id}>
                    <div className="row-main"><p className="row-name">{p.name}</p></div>
                    <span className="num" style={{ fontSize: 15 }}>{inr(p.price)}</span>
                    <div className="stepper">
                      <button aria-label={`One less ${p.name}`} disabled={!(draft[p.id] ?? 0)} onClick={() => set(p.id, (draft[p.id] ?? 0) - 1)}>−</button>
                      <b className="num">{draft[p.id] ?? 0}</b>
                      <button aria-label={`One more ${p.name}`} onClick={() => set(p.id, (draft[p.id] ?? 0) + 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              {draftTotal > 0 && (
                <div className="summary">
                  <p className="s-lines">Adding <span className="num s-total">{inr(draftTotal)}</span> to {tab.who}&apos;s tab</p>
                  <button className="btn btn-ink" disabled={busy} onClick={addDraft}>{busy ? "Adding..." : "Add to tab"}</button>
                </div>
              )}
            </>
          ) : (
            <p className="muted" style={{ marginTop: 24 }}>No open tabs. Open one above to start.</p>
          )}

          {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}

          {settled.length > 0 && (
            <section className="block">
              <div className="sec-head"><h2>Settled today</h2></div>
              <div className="rows">
                {settled.map((t) => (
                  <div className="row-item" key={t.id}>
                    <div className="row-main">
                      <p className="row-name">{t.who}{t.tableNo ? `, table ${t.tableNo}` : ""}</p>
                      <p className="muted">{t.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}</p>
                    </div>
                    <span className="num">{inr(t.total)}{t.payMethod ? ` · ${t.payMethod}` : ""}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
