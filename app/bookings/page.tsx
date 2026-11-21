"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { fmtTime, inr } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";

const typeLabel = { REGULAR: "Regular", FRIDAY_SOCIAL: "Social Play", TRIAL: "Trial" } as const;

export default function Bookings() {
  const [date, setDate] = useState("");
  const [msg, setMsg] = useState("");
  const bookings = useApi(() => api.bookings(date || undefined), [date]);
  const rows = bookings.data ?? [];
  const live = rows.filter((b) => b.state === "BOOKED");

  async function cancel(id: number) {
    setMsg("");
    try {
      await api.cancelBooking(id);
      setMsg("Booking cancelled. The court slot is now free.");
      void bookings.reload();
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : "Cancelling failed. Try again.");
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
        {!bookings.loading && !bookings.error && (
          <p className="count-line"><b>{live.length}</b> {live.length === 1 ? "booking" : "bookings"} standing{date ? " that day" : ""}</p>
        )}
      </div>

      {msg && <div className={`notice ${msg.includes("failed") ? "err" : "ok"}`} role="status">{msg}</div>}
      {bookings.loading ? (
        <Loading />
      ) : bookings.error ? (
        <ErrorBox message={bookings.error} onRetry={bookings.reload} />
      ) : live.length === 0 ? (
        <Empty>No bookings standing. The courts are free.</Empty>
      ) : (
        <div className="ledger-wrap">
          <table className="ledger">
            <thead><tr><th>Date</th><th>Time</th><th>Court</th><th>Who</th><th className="hide-m">Type</th><th className="hide-m">Price</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className={b.state === "CANCELLED" ? "row-off" : ""}>
                  <td className="num">{b.date}</td>
                  <td className="num">{fmtTime(b.start)}</td>
                  <td>{b.court}</td>
                  <td>{b.who}{b.type === "TRIAL" && b.phone ? <span className="muted"> · {b.phone}</span> : null}</td>
                  <td className="hide-m">{typeLabel[b.type]}</td>
                  <td className="num hide-m">{b.price ? inr(b.price) : "Plan"}</td>
                  <td><span className={`status ${b.state === "BOOKED" ? "booked" : "cancelled"}`}>{b.state === "BOOKED" ? "Booked" : "Cancelled"}</span></td>
                  <td className="r">{b.state === "BOOKED" && <button className="text-link" onClick={() => cancel(b.id)}>Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
