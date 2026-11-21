"use client";
import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { allStarts, fmtTime, inr, istMinutesNow, todayISO } from "@/lib/format";
import { Loading, ErrorBox } from "@/components/States";
import Link from "next/link";
import type { StaffDTO } from "@/lib/types";

const starts = allStarts();

export default function Courts() {
  const today = todayISO();
  const [courtId, setCourtId] = useState(1);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const courts = useApi(() => api.courts());
  const avail = useApi(() => api.availability(courtId, date), [courtId, date]);
  const lookup = useApi(
    () => (name.trim().length >= 3 ? api.lookupMember(name.trim()) : Promise.resolve({ member: null })),
    [name],
  );

  const court = courts.data?.find((c) => c.id === courtId);
  const member = lookup.data?.member ?? null;
  const [staff, setStaff] = useState<StaffDTO | null>(null);
  const [meKnown, setMeKnown] = useState(false);
  useEffect(() => {
    api.me()
      .then((r) => setStaff(r.staff))
      .catch(() => setStaff(null))
      .finally(() => setMeKnown(true));
  }, []);
  const canBook = !!staff && (staff.role === "OWNER" || staff.role === "FRONT_DESK" || staff.role === "STAFF");
  // a booking runs a full hour, so it also blocks the starts either side of it
  const taken = avail.data?.taken ?? [];
  const free = (t: number) =>
    !taken.some((b) => Math.abs(b - t) < 60) && (date !== today || t + 60 > istMinutesNow());
  const price = slot === null || !court ? null : member ? (court.sport === "Cricket" ? member.cricketPrice : member.tennisPrice) : court.walkinPrice;

  useEffect(() => {
    setSlot(null);
  }, [courtId, date]);

  async function book() {
    if (slot === null || !name.trim() || !court) return;
    setBusy(true);
    setMsg(null);
    try {
      const b = await api.createBooking({ courtId, date, start: slot, name: name.trim() });
      setMsg({
        ok: true,
        text: `Booked. ${court.name}, ${date === today ? "today" : date} at ${fmtTime(slot)}${b.price ? `, ${inr(b.price)} at the desk` : ", covered by your plan"}.`,
      });
      setSlot(null);
      void avail.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Booking failed. Try again." });
      void avail.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Play</p>
        <h1 className="page-title">Courts</h1>
        <p className="sub">Pick a court and a day. Crossed-out slots are taken, and a booking covers the full hour.</p>
      </div>

      {courts.loading ? (
        <Loading rows={2} />
      ) : courts.error ? (
        <ErrorBox message={courts.error} onRetry={courts.reload} />
      ) : (
        <div className="panel panel-main">
          <div className="step">
            <div className="step-head">
              <span className="step-n">1</span>
              <h3>Pick a court</h3>
              <span className="step-hint">Prices are the walk-in rate; member plans apply by name</span>
            </div>
            <div className="seg" role="group" aria-label="Court">
              {courts.data!.map((c) => (
                <button key={c.id} aria-pressed={courtId === c.id} onClick={() => setCourtId(c.id)}>
                  <span>{c.name}</span>
                  <span className="num seg-price">{inr(c.walkinPrice)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="step">
            <div className="step-head">
              <span className="step-n">2</span>
              <h3>Date and time</h3>
              <span className="step-hint">One hour a booking, crossed-out slots are taken</span>
            </div>
            <div style={{ maxWidth: 300 }}>
              <label htmlFor="date">Date</label>
              <input id="date" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
            </div>
            {avail.loading ? (
              <div style={{ marginTop: 12 }}><Loading rows={3} /></div>
            ) : avail.error ? (
              <ErrorBox message={avail.error} onRetry={avail.reload} />
            ) : (
              <div className="slots" role="group" aria-label="Start times">
                {starts.map((t) => (
                  <button key={t} className={`slot num${date === today && t + 60 <= istMinutesNow() ? " past" : ""}`} disabled={!free(t)} aria-pressed={slot === t} onClick={() => setSlot(t)}>
                    {fmtTime(t)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="step">
            <div className="step-head">
              <span className="step-n">3</span>
              <h3>Your details</h3>
              <span className="step-hint">Members: your registered name gets your plan price</span>
            </div>
            {!meKnown ? null : !canBook ? (
              <p className="muted" style={{ maxWidth: 520 }}>
                Bookings are made at the front desk, so this page shows live availability for everyone.
                Visiting first? <Link className="text-link" href="/trial">Book a free trial</Link>
                {staff ? "." : <> or <Link className="text-link" href="/login">sign in as staff</Link> to book.</>}
              </p>
            ) : (
            <div style={{ maxWidth: 420 }}>
              <label htmlFor="name">Your name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Members: your registered name" />
            </div>
            )}
            {member && (
              <p className={`member-strip${member.state === "expired" ? " warn" : ""}`} role="status">
                {member.state === "expired"
                  ? `${member.name}, ${member.plan} plan, expired. Bookings are paused until it is renewed.`
                  : `${member.name}, ${member.plan} plan, this court at ${inr(court?.sport === "Cricket" ? member.cricketPrice : member.tennisPrice)} an hour.`}
              </p>
            )}
            {name.trim().length >= 3 && !lookup.loading && !member && (
              <p className="muted" style={{ marginTop: 8 }} role="status">
                No member found under that name. Walk-in rate applies.
              </p>
            )}

            {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}

            <div className="summary">
            <p className="s-lines">
              {slot === null || !court ? (
                "No slot picked yet."
              ) : (
                <>
                  {court.name} at <span className="num">{fmtTime(slot)}</span> ·{" "}
                  <span className="num s-price">
                    {price === 0 ? "Covered by your plan" : inr(price ?? 0)}
                  </span>
                </>
              )}
            </p>
              <button className="btn btn-ink" disabled={!canBook || slot === null || !name.trim() || busy} onClick={book}>
                {!canBook ? "Front desk only — sign in to book" : busy ? "Booking..." : slot === null || !court ? "Pick a slot first" : `Book ${court.name} at ${fmtTime(slot)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="muted" style={{ marginTop: 28, maxWidth: 640 }}>
        The rules are the same for everyone: one hour a booking, two bookings a day at most, and an expired plan pauses booking until it is renewed. Friday Social Play is the one exception, shared courts from 7 PM.
      </p>
    </main>
  );
}
