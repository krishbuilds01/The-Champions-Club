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
      <div className="head-row">
        <div className="page-head">
          <p className="page-eyebrow">The club</p>
          <h1 className="page-title">Owner dashboard</h1>
          <p className="sub">The whole day in one place: courts, shop and bar.</p>
        </div>
        {!dash.loading && !dash.error && (
          <div className="head-actions">
            <div className="seg" role="group" aria-label="Period">
              {periods.map((p) => (
                <button key={p.code} aria-pressed={period === p.code} onClick={() => setPeriod(p.code)}>{p.label}</button>
              ))}
            </div>
            <button className="btn btn-quiet" onClick={exportCsv}>Export CSV</button>
          </div>
        )}
      </div>

      {dash.loading ? (
        <Loading />
      ) : dash.error ? (
        <ErrorBox message={dash.error} onRetry={dash.reload} />
      ) : (
        <>

          <div className="figures">
            {figures.map((f) => (
              <div className={`figure${f.total ? " total" : ""}`} key={f.label}>
                <p className="f-label">{f.label}</p>
                <p className="f-value num"><NumberTicker value={f.value} /></p>
              </div>
            ))}
          </div>

          {d!.byMethod.length > 0 && (
            <div className="panel" style={{ marginTop: 16, padding: "18px 22px" }}>
              <p className="f-label" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Taken today at the tills</p>
              <div className="method-grid">
                {d!.byMethod.map((m) => (
                  <div className="m-item" key={m.method}>
                    <b className="num">{inr(m.amount)}</b>
                    <span>{methodLabel[m.method]}</span>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>Shop and bar tills only — court money is paid at the desk.</p>
            </div>
          )}

          {d!.lowStock.length > 0 && (
            <div className="notice warn" role="status">
              Running low in the shop: {d!.lowStock.map((p) => `${p.name} (${p.stock} left)`).join(", ")}.
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
          </section>

          <section className="block">
            <div className="sec-head"><h2>Run the club</h2></div>
            <div className="jump-grid">
              {[
                { href: "/members", title: "Members", note: "Plans, renewals, sign-ins" },
                { href: "/bookings", title: "Bookings", note: "Every court, every day" },
                { href: "/bar", title: "Bar tabs", note: "Open tabs and settling" },
                { href: "/shop", title: "Shop", note: "Counter and online orders" },
                { href: "/invoices", title: "Invoices", note: "Bills sent and paid" },
                { href: "/expenses", title: "Expenses", note: "What the club spends" },
                { href: "/payroll", title: "Payroll", note: "Staff pay, monthly" },
                { href: "/shifts", title: "Staff rota", note: "Who is on, and when" },
              ].map((j) => (
                <Link className="jump-card" href={j.href} key={j.href}>
                  <span><b>{j.title}</b><span>{j.note}</span></span>
                  <span className="j-arrow" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
