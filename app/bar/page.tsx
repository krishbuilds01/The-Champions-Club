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

// Menu photos, in the club's own colours. Hero art is a warm café photo;
// dish photos are stable Unsplash images, checked live, with a pine
// gradient behind them if one ever fails.
const menuImage = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("cold coffee")) return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80&auto=format&fit=crop";
  if (n.includes("protein shake")) return "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80&auto=format&fit=crop";
  if (n.includes("sandwich")) return "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80&auto=format&fit=crop";
  if (n.includes("fries")) return "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&q=80&auto=format&fit=crop";
  if (n.includes("iced tea")) return "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80&auto=format&fit=crop";
  if (n.includes("lime")) return "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&q=80&auto=format&fit=crop";
  if (n.includes("coffee") || n.includes("shake")) return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80&auto=format&fit=crop";
  if (n.includes("tea") || n.includes("soda") || n.includes("juice")) return "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80&auto=format&fit=crop";
  return "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80&auto=format&fit=crop";
};

const menuCategory = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("coffee") || n.includes("shake")) return "Coffee & shakes";
  if (n.includes("sandwich") || n.includes("fries")) return "Food";
  return "Drinks";
};

const barCategories = ["All", "Drinks", "Coffee & shakes", "Food"] as const;

const barHeroImage = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&q=80&auto=format&fit=crop";

export default function Bar() {
  const menu = useApi(() => api.products("BAR"));
  const plans = useApi(() => api.plans());
  const [tabs, setTabs] = useState<TabDTO[] | null>(null);
  const [tabsErr, setTabsErr] = useState("");
  const [who, setWho] = useState("");
  const [tableNo, setTableNo] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [payMethod, setPayMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [category, setCategory] = useState<(typeof barCategories)[number]>("All");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const items = menu.data ?? [];
  const shown = items.filter(
    (p) =>
      (category === "All" || menuCategory(p.name) === category) &&
      p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
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
      const t = await api.openTab({ who: who.trim(), tableNo: tableNo ?? undefined });
      setWho("");
      setTableNo(null);
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
    <main className="shop-page">
      <section className="shop-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={barHeroImage} alt="Warm café counter at Champions Club" className="shop-hero-img" />
        <div className="shop-hero-shade" />
        <div className="wrap shop-hero-in">
          <p className="shop-eyebrow">Clubhouse · Bar &amp; Café</p>
          <h1 className="shop-title">Bar &amp; Café</h1>
          <p className="shop-sub">Open a tab, add as they order, settle before they leave. The member&apos;s plan discount applies itself at settle — no asking, no maths at the table.</p>
          <div className="shop-hero-chips">
            <span>Run a tab, settle before you leave</span>
            <span>Members save up to 20%</span>
            <span>Cash · Card · UPI</span>
          </div>
        </div>
      </section>

      <div className="wrap page shop-body">
      <div className="shop-toolbar">
        <div className="shop-cats" role="group" aria-label="Filter the menu by category">
          {barCategories.map((c) => (
            <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <input className="shop-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the menu…" aria-label="Search the menu" />
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
          <div className="shop-grid" style={{ marginTop: 20 }}>
            {shown.map((p) => (
              <div className="product-card" key={p.id}>
                <div className="product-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={menuImage(p.name)} alt={p.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  <span className="p-cat">{menuCategory(p.name)}</span>
                </div>
                <div className="p-body">
                  <p className="p-name">{p.name}</p>
                  <p className="p-price">{inr(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <section aria-label="Tables" style={{ marginBottom: 24 }}>
            <div className="sec-head"><h2>Tables</h2></div>
            <div className="tables-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                const t = open.find((x) => x.tableNo === n);
                return t ? (
                  <button key={n} className="table-tile occupied" aria-pressed={tab?.id === t.id} onClick={() => setSelected(t.id)}>
                    <span className="t-no">T{n}</span>
                    <span className="t-meta">{t.who} · <span className="num">{inr(t.subtotal)}</span>{t.items.length ? ` · ${t.items.reduce((s, i) => s + i.qty, 0)} items` : ""}</span>
                  </button>
                ) : (
                  <button key={n} className="table-tile" aria-pressed={tableNo === n} onClick={() => setTableNo(n)}>
                    <span className="t-no">T{n}</span>
                    <span className="t-meta">Free</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="panel panel-main">
          <div className="bar-open-grid" style={{ maxWidth: 640, gridTemplateColumns: "1fr auto" }}>
            <div>
              <label htmlFor="b-who">Open a tab for</label>
              <input id="b-who" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Member or guest name" />
            </div>
            <button className="btn btn-ink" disabled={!who.trim() || busy} onClick={openNew}>Open tab</button>
          </div>
          <div style={{ marginTop: 14 }}>
            <label>Table</label>
            <div className="seg" role="group" aria-label="Table">
              <button aria-pressed={tableNo === null} onClick={() => setTableNo(null)}>None</button>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button key={n} aria-pressed={tableNo === n} disabled={open.some((t) => t.tableNo === n)} onClick={() => setTableNo(n)}>T{n}</button>
              ))}
            </div>
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

              <div className="sec-head" style={{ marginTop: 28 }}><h2>The menu</h2></div>
              <div className="shop-grid">
                {shown.map((p) => (
                  <div className={`product-card${(draft[p.id] ?? 0) > 0 ? " picked" : ""}`} key={p.id}>
                    <div className="product-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={menuImage(p.name)} alt={p.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      <span className="p-cat">{menuCategory(p.name)}</span>
                    </div>
                    <div className="p-body">
                      <p className="p-name">{p.name}</p>
                      <p className="p-price">{inr(p.price)}</p>
                      <div className="p-foot">
                        <span className="muted">{(draft[p.id] ?? 0) > 0 ? <><span className="num">{inr((draft[p.id] ?? 0) * p.price)}</span> on this tab</> : "Add to the tab"}</span>
                        <div className="stepper">
                          <button aria-label={`One less ${p.name}`} disabled={!(draft[p.id] ?? 0)} onClick={() => set(p.id, (draft[p.id] ?? 0) - 1)}>−</button>
                          <b className="num">{draft[p.id] ?? 0}</b>
                          <button aria-label={`One more ${p.name}`} onClick={() => set(p.id, (draft[p.id] ?? 0) + 1)}>+</button>
                        </div>
                      </div>
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
      </div>
    </main>
  );
}
