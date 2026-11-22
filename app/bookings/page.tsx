"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { fmtTime, inr } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";

const typeLabel = { REGULAR: "Regular", FRIDAY_SOCIAL: "Social Play", TRIAL: "Trial" } as const;

// "22 Nov 2026" instead of a raw YYYY-MM-DD string.
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

export default function Bookings() {
  const [date, setDate] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "BOOKED" | "CANCELLED">("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const bookings = useApi(() => api.bookings(date || undefined), [date]);
  const rows = bookings.data ?? [];
  const shown = statusFilter === "all" ? rows : rows.filter((b) => b.state === statusFilter);

  async function cancel(b: { id: number; who: string; court: string; date: string }) {
    if (!window.confirm(`Cancel ${b.who}'s booking on ${b.court}, ${fmtDate(b.date)}? The slot will be free again.`)) return;
    setMsg(null);
    setBusyId(b.id);
    try {
      await api.cancelBooking(b.id);
      setMsg({ ok: true, text: "Booking cancelled. The court slot is now free." });
      void bookings.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Cancelling failed. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Front desk</p>
        <h1 className="page-title">Bookings</h1>
        <p className="sub">Every booking on the books from today on. Cancelling frees the slot at once.</p>
      </div>

      <div className="toolbar">
        <div style={{ width: 260, maxWidth: "100%" }}>
          <label htmlFor="b-date">Show one day</label>
          <input id="b-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {date && (
            <button className="text-link" style={{ marginTop: 6 }} onClick={() => setDate("")}>
              Show all upcoming days
            </button>
          )}
        </div>
        <div className="seg" role="group" aria-label="Filter by status">
          {(["all", "BOOKED", "CANCELLED"] as const).map((s) => (
            <button key={s} aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : s === "BOOKED" ? "Booked" : "Cancelled"}
            </button>
          ))}
        </div>
        {!bookings.loading && !bookings.error && (
          <p className="count-line"><b>{shown.length}</b> {shown.length === 1 ? "booking" : "bookings"}{date ? " that day" : ""}</p>
        )}
      </div>

      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}
      {bookings.loading ? (
        <Loading />
      ) : bookings.error ? (
        <ErrorBox message={bookings.error} onRetry={bookings.reload} />
      ) : shown.length === 0 ? (
        <Empty>{statusFilter === "CANCELLED" ? "No cancelled bookings." : "No bookings standing. The courts are free."}</Empty>
      ) : (
        <div className="ledger-wrap">
          <table className="ledger">
            <thead><tr><th>Date</th><th>Time</th><th>Court</th><th>Who</th><th className="hide-m">Type</th><th className="hide-m">Price</th><th>Status</th><th /></tr></thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id} className={b.state === "CANCELLED" ? "row-off" : ""}>
                  <td className="num" style={{ whiteSpace: "nowrap" }}>{fmtDate(b.date)}</td>
                  <td className="num">{fmtTime(b.start)}</td>
                  <td>{b.court}</td>
                  <td>{b.who}{b.type === "TRIAL" && b.phone ? <span className="muted"> · {b.phone}</span> : null}</td>
                  <td className="hide-m">{typeLabel[b.type]}</td>
                  <td className="num hide-m">{b.price ? inr(b.price) : "Plan"}</td>
                  <td><span className={`status ${b.state === "BOOKED" ? "booked" : "cancelled"}`}>{b.state === "BOOKED" ? "Booked" : "Cancelled"}</span></td>
                  <td className="r">{b.state === "BOOKED" && <button className="text-link" disabled={busyId === b.id} onClick={() => cancel(b)}>{busyId === b.id ? "Cancelling..." : "Cancel"}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
