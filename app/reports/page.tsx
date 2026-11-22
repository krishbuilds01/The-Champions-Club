"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { inr, todayISO } from "@/lib/format";
import { Loading, ErrorBox } from "@/components/States";

// Owner tax report: what was billed and what tax was charged on
// invoices in the month, against the tax deducted from staff pay.
// The numbers come from GET /reports/tax (OWNER only); a non-owner
// who opens this page sees the 403 from that endpoint, not numbers.
function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  // Date.UTC takes a 0-based month, so passing m (1-based) lands on
  // the first of next month; one day back is the last day of this one.
  const nextFirst = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.parse(nextFirst) - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { from, to };
}

export default function Reports() {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const { from, to } = monthBounds(month);
  const rep = useApi(() => api.taxSummary(from, to), [from, to]);
  const d = rep.data;

  // Download the figures on screen as a CSV file (client-side, no endpoint).
  function exportCsv() {
    if (!d) return;
    const lines: string[][] = [];
    lines.push(["The Champions Club — tax report", `Month: ${month}`, `Window: ${d.from} to ${d.to}`]);
    lines.push([]);
    lines.push(["Figure", "Amount (Rs)"]);
    lines.push(["Invoiced", String(d.invoiced)]);
    lines.push(["Tax charged on invoices", String(d.invoiceTax)]);
    lines.push(["Tax deducted from staff pay", String(d.payrollTax)]);
    lines.push(["Net tax position", String(d.netTax)]);
    lines.push([]);
    lines.push(["Invoices in window", String(d.invoiceCount)]);
    lines.push(["Payroll records in window", String(d.payrollCount)]);
    const csv = lines.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `champions-tax-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const figures = d
    ? [
        { label: "Invoiced", value: d.invoiced, note: `${d.invoiceCount} invoice${d.invoiceCount === 1 ? "" : "s"} in the window` },
        { label: "Tax charged on invoices", value: d.invoiceTax, note: "From the tax rate recorded on each invoice" },
        { label: "Tax deducted from staff pay", value: d.payrollTax, note: `${d.payrollCount} payroll record${d.payrollCount === 1 ? "" : "s"} in the window` },
        { label: "Net tax position", value: d.netTax, note: "Invoice tax less payroll tax deducted", total: true },
      ]
    : [];

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">The club</p>
        <h1 className="page-title">Tax report</h1>
        <p className="sub">What was billed, what tax was charged, and what was already deducted from staff pay.</p>
      </div>

      {rep.loading ? (
        <Loading />
      ) : rep.error ? (
        <ErrorBox message={rep.error} onRetry={rep.reload} />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              Month
              <input
                type="month"
                value={month}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                max={todayISO().slice(0, 7)}
              />
            </label>
            <button className="btn btn-quiet" onClick={exportCsv}>Export CSV</button>
          </div>

          <p className="sub" style={{ marginBottom: 18 }}>
            Window: <span className="num">{d!.from}</span> to <span className="num">{d!.to}</span>
          </p>

          <div className="figures">
            {figures.map((f) => (
              <div className={`figure${f.total ? " total" : ""}`} key={f.label}>
                <p className="f-label">{f.label}</p>
                <p className="f-value num">{inr(f.value)}</p>
                <p className="sub" style={{ marginTop: 6 }}>{f.note}</p>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="mini-link" href="/invoices">Invoices</Link>
            <Link className="mini-link" href="/payroll">Payroll</Link>
            <Link className="mini-link" href="/dashboard">Dashboard</Link>
          </p>
        </>
      )}
    </main>
  );
}
