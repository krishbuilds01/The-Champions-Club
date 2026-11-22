"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { fmtTime, inr, todayISO } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";
import NumberTicker from "@/components/NumberTicker";

const typeLabel = { REGULAR: "Regular", FRIDAY_SOCIAL: "Social Play", TRIAL: "Trial" } as const;
const methodLabel = { CASH: "Cash", CARD: "Card", UPI: "UPI", ONLINE: "Online" } as const;

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

  // Download the numbers on screen as a CSV file (client-side, no endpoint).
  function exportCsv() {
    if (!d || !split) return;
    const lines: string[][] = [];
    lines.push(["The Champions Club — dashboard", `Period: ${period}`, `Date: ${today}`]);
    lines.push([]);
    lines.push(["Figures", "Amount (Rs)"]);
    lines.push(["Courts", String(split.courts)]);
    lines.push(["Shop", String(split.shop)]);
    lines.push(["Bar", String(split.bar)]);
    lines.push(["Total", String(split.total)]);
    lines.push([]);
    lines.push(["Taken today by method", "Amount (Rs)"]);
    d.byMethod.forEach((m) => lines.push([methodLabel[m.method], String(m.amount)]));
    lines.push([]);
    lines.push(["Low stock", "Stock left"]);
    d.lowStock.forEach((p) => lines.push([p.name, String(p.stock)]));
    const csv = lines.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `champions-dashboard-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">The club</p>
        <h1 className="page-title">Owner dashboard</h1>
        <p className="sub">The whole day in one place: courts, shop and bar.</p>
      </div>

      {dash.loading ? (
        <Loading />
      ) : dash.error ? (
        <ErrorBox message={dash.error} onRetry={dash.reload} />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <div className="seg" role="group" aria-label="Period">
              {periods.map((p) => (
                <button key={p.code} aria-pressed={period === p.code} onClick={() => setPeriod(p.code)}>{p.label}</button>
              ))}
            </div>
            <button className="btn btn-quiet" onClick={exportCsv}>Export CSV</button>
          </div>


          <div className="figures">
            {figures.map((f) => (
              <div className={`figure${f.total ? " total" : ""}`} key={f.label}>
                <p className="f-label">{f.label}</p>
                <p className="f-value num"><NumberTicker value={f.value} /></p>
              </div>
            ))}
          </div>

          {d!.byMethod.length > 0 && (
            <p className="pay-strip">
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

          {d!.expiring.length > 0 && (
            <section className="block">
              <div className="sec-head">
                <h2>Expiring in the next 14 days (today)</h2>
                <Link className="text-link" href="/members">All members</Link>
              </div>
              <div className="ledger-wrap">
                <table className="ledger">
                  <thead><tr><th>Member</th><th className="hide-m">Plan</th><th className="hide-m">Phone</th><th>Expires</th><th className="r">Days left</th></tr></thead>
                  <tbody>
                    {d!.expiring.map((m) => (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td className="hide-m">{m.planName}</td>
                        <td className="hide-m num">{m.phone}</td>
                        <td>{m.expiresOn}</td>
                        <td className="r num">{m.daysLeft === 0 ? "Today" : m.daysLeft}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
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
            <p style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="mini-link" href="/members">Members</Link>
              <Link className="mini-link" href="/bar">Bar tabs</Link>
              <Link className="mini-link" href="/shop">Shop</Link>
              <Link className="mini-link" href="/invoices">Invoices</Link>
              <Link className="mini-link" href="/expenses">Expenses</Link>
              <Link className="mini-link" href="/payroll">Payroll</Link>
              <Link className="mini-link" href="/shifts">Staff rota</Link>
            </p>
          </section>
        </>
      )}
    </main>
  );
}
