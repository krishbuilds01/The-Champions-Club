"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { fmtTime, inr, todayISO } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";
import NumberTicker from "@/components/NumberTicker";

const typeLabel = { REGULAR: "Regular", FRIDAY_SOCIAL: "Social Play", TRIAL: "Trial" } as const;
const methodLabel = { CASH: "Cash", CARD: "Card", UPI: "UPI" } as const;

const periods = [
  { code: "today", label: "Today" },
  { code: "week", label: "Last 7 days" },
  { code: "month", label: "Last 30 days" },
] as const;

export default function Dashboard() {
  const today = todayISO();
  const dash = useApi(() => api.dashboard(today), [today]);
  const d = dash.data;
  const [period, setPeriod] = useState<(typeof periods)[number]["code"]>("today");

  const split = d?.periods[period];
  const figures = split
    ? [
        { label: "Courts", value: split.courts },
        { label: "Shop", value: split.shop },
        { label: "Bar", value: split.bar },
        { label: "Total", value: split.total, total: true },
      ]
    : [];

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">The club</p>
        <h1 className="page-title">Owner dashboard</h1>
        <p className="sub">The whole day in one place: courts, shop and bar. Staff view.</p>
      </div>

      {dash.loading ? (
        <Loading />
      ) : dash.error ? (
        <ErrorBox message={dash.error} onRetry={dash.reload} />
      ) : (
        <>
          <div className="seg" role="group" aria-label="Period" style={{ marginBottom: 18 }}>
            {periods.map((p) => (
              <button key={p.code} aria-pressed={period === p.code} onClick={() => setPeriod(p.code)}>{p.label}</button>
            ))}
          </div>

          <div className="figures">
            {figures.map((f) => (
              <div className={`figure${f.total ? " total" : ""}`} key={f.label}>
                <p className="f-label">{f.label}</p>
                <p className="f-value num"><NumberTicker value={f.value} /></p>
              </div>
            ))}
          </div>

          {period === "today" && d!.byMethod.length > 0 && (
            <p className="muted" style={{ marginTop: 14 }}>
              Taken today by{" "}
              {d!.byMethod.map((m, i) => (
                <span key={m.method}>
                  {i > 0 ? " · " : ""}
                  {methodLabel[m.method]} <span className="num">{inr(m.amount)}</span>
                </span>
              ))}{" "}
              at the shop and bar tills. Court money is paid at the desk.
            </p>
          )}

          {d!.lowStock.length > 0 && (
            <div className="notice warn" role="status" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Running low in the shop: {d!.lowStock.map((p) => `${p.name} (${p.stock} left)`).join(", ")}.</span>
              <Link className="text-link" href="/inventory">Manage inventory &rarr;</Link>
            </div>
          )}

          <section className="block">
            <div className="sec-head">
              <h2>On court today</h2>
              <Link className="text-link" href="/bookings">All bookings</Link>
            </div>
            {d!.onCourt.length === 0 ? (
              <Empty>Nothing on court today yet. Bookings made on the Courts page will show up here.</Empty>
            ) : (
              <div className="ledger-wrap">
                <table className="ledger">
                  <thead><tr><th>Time</th><th>Court</th><th>Who</th><th className="hide-m">Type</th><th className="r">Price</th></tr></thead>
                  <tbody>
                    {d!.onCourt.map((b) => (
                      <tr key={b.id}>
                        <td className="num">{fmtTime(b.start)}</td>
                        <td>{b.court}</td>
                        <td>{b.who}</td>
                        <td className="hide-m">{typeLabel[b.type]}</td>
                        <td className="r num">{b.price ? inr(b.price) : "Plan"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ marginTop: 20, display: "flex", gap: 20 }}>
              <Link className="text-link" href="/members">Members</Link>
              <Link className="text-link" href="/bar">Bar tabs</Link>
              <Link className="text-link" href="/shop">Shop</Link>
            </p>
          </section>
        </>
      )}
    </main>
  );
}
