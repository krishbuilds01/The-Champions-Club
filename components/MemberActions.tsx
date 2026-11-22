"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { allStarts, fmtTime, inr, istMinutesNow, todayISO } from "@/lib/format";
import { payOnlineWithRazorpay } from "@/lib/pay-online";

// Book a court and order from the shop, as the signed-in member.
// Both post to the member routes, which run the same services (and
// the same rules) as the desk flows.
export default function MemberActions() {
  const router = useRouter();
  const today = todayISO();
  const courts = useApi(() => api.courts(), []);
  const products = useApi(() => api.products("GEAR"), []);
  const payCfg = useApi(() => api.payConfig(), []);

  const [courtId, setCourtId] = useState(1);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<number | null>(null);
  const avail = useApi(() => api.availability(courtId, date), [courtId, date]);
  const taken = avail.data?.taken ?? [];
  const free = (t: number) => !taken.some((b) => Math.abs(b.start - t) < 60) && (date !== today || t + 60 > istMinutesNow());
  const freeSlots = allStarts().filter(free);
  useEffect(() => {
    if (freeSlots.length && (slot === null || !freeSlots.includes(slot))) setSlot(freeSlots[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avail.data]);
  const court = courts.data?.find((c) => c.id === courtId);
  const [bookMsg, setBookMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [bookBusy, setBookBusy] = useState(false);

  async function book() {
    if (slot === null || !court) return;
    setBookBusy(true);
    setBookMsg(null);
    try {
      const b = await api.memberBook({ courtId, date, start: slot });
      setBookMsg({ ok: true, text: `Booked — ${court.name}, ${date === today ? "today" : date} at ${fmtTime(slot)}, ${inr(b.price)} at the desk.` });
      void avail.reload();
      router.refresh();
    } catch (e) {
      setBookMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Booking failed. Try again." });
      void avail.reload();
    } finally {
      setBookBusy(false);
    }
  }

  const [cart, setCart] = useState<Record<number, number>>({});
  const [pay, setPay] = useState<"CASH" | "CARD" | "UPI">("UPI");
  const [fulfilment, setFulfilment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [address, setAddress] = useState("");
  const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => ({ productId: Number(id), qty: q }));
  const subtotal = items.reduce((s, i) => s + (products.data?.find((p) => p.id === i.productId)?.price ?? 0) * i.qty, 0);
  const [orderMsg, setOrderMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [orderBusy, setOrderBusy] = useState(false);

  async function order(payOnline = false) {
    const keyId = payCfg.data?.keyId;
    if (payOnline && !keyId) return;
    setOrderBusy(true);
    setOrderMsg(null);
    try {
      const o = await api.memberOrder({ items, payMethod: pay, fulfilment, address: fulfilment === "DELIVERY" ? address.trim() : undefined, payOnline });
      if (payOnline) {
        const outcome = await payOnlineWithRazorpay(o, keyId!);
        setOrderMsg(outcome === "paid"
          ? { ok: true, text: `Paid online — ${inr(o.total)}${o.discount ? `, you saved ${inr(o.discount)}` : ""}. ${fulfilment === "DELIVERY" ? "We will deliver it to your address." : "Pick it up at the shop counter."}` }
          : { ok: false, text: "Payment window closed before paying. The order is saved as pending — the desk can take payment at the counter." });
      } else {
        setOrderMsg({ ok: true, text: `Order placed — ${inr(o.total)}${o.discount ? `, you saved ${inr(o.discount)}` : ""}. ${fulfilment === "DELIVERY" ? "We will deliver it to your address." : "Pick it up at the shop counter."}` });
      }
      setCart({});
      router.refresh();
    } catch (e) {
      setOrderMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Order failed. Try again." });
    } finally {
      setOrderBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 30, display: "grid", gap: 30 }}>
      <section aria-label="Book a court">
        <div className="sec-head"><h2>Book a court</h2></div>
        <div className="panel panel-main">
        <div className="form-grid">
          <div>
            <label>Court</label>
            <div className="seg" role="group" aria-label="Court">
              {(courts.data ?? []).map((c) => (
                <button key={c.id} aria-pressed={courtId === c.id} onClick={() => setCourtId(c.id)}>{c.name}</button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="mb-date">Date</label>
            <input id="mb-date" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label>Start time — one hour</label>
            <div className="slots" role="group" aria-label="Start times">
              {allStarts().map((t) => (
                <button key={t} className={`slot num${date === today && t + 60 <= istMinutesNow() ? " past" : ""}`} disabled={!free(t)} aria-pressed={slot === t} onClick={() => setSlot(t)}>
                  {fmtTime(t)}
                </button>
              ))}
            </div>
          </div>
          {bookMsg && <div className={`notice ${bookMsg.ok ? "ok" : "err"}`} role="status">{bookMsg.text}</div>}
          <div>
            <button className="btn btn-ink" disabled={bookBusy || slot === null} onClick={book}>
              {bookBusy ? "Booking..." : "Book this court"}
            </button>
          </div>
        </div>
        </div>
      </section>

      <section aria-label="Order from the shop">
        <div className="sec-head"><h2>Order from the shop</h2></div>
        <div className="panel panel-main">
        <div style={{ display: "grid", gap: 10 }}>
          {(products.data ?? []).map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span>
                {p.name} · <span className="num">{inr(p.price)}</span>
                {p.stock !== null && <span className="muted"> · {p.stock === 0 ? "out of stock" : `${p.stock} in stock`}</span>}
              </span>
              <span className="stepper">
                <button aria-label={`One less ${p.name}`} disabled={!(cart[p.id] ?? 0)} onClick={() => setCart({ ...cart, [p.id]: (cart[p.id] ?? 0) - 1 })}>−</button>
                <b className="num">{cart[p.id] ?? 0}</b>
                <button aria-label={`One more ${p.name}`} disabled={p.stock === 0 || (cart[p.id] ?? 0) >= (p.stock ?? 0)} onClick={() => setCart({ ...cart, [p.id]: (cart[p.id] ?? 0) + 1 })}>+</button>
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <label>Pickup or delivery</label>
          <div className="seg" role="group" aria-label="Pickup or delivery">
            <button aria-pressed={fulfilment === "PICKUP"} onClick={() => setFulfilment("PICKUP")}>Pickup</button>
            <button aria-pressed={fulfilment === "DELIVERY"} onClick={() => setFulfilment("DELIVERY")}>Delivery</button>
          </div>
        </div>
        {fulfilment === "DELIVERY" && (
          <div style={{ marginTop: 14 }}>
            <label htmlFor="mo-address">Delivery address</label>
            <input id="mo-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat, street, landmark" />
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <label>{fulfilment === "DELIVERY" ? "Paying by" : "Pay at pickup"}</label>
          <div className="seg" role="group" aria-label="Pay method">
            {(["CASH", "CARD", "UPI"] as const).map((m) => (
              <button key={m} aria-pressed={pay === m} onClick={() => setPay(m)}>{m === "UPI" ? "UPI" : m.charAt(0) + m.slice(1).toLowerCase()}</button>
            ))}
          </div>
        </div>
        {orderMsg && <div className={`notice ${orderMsg.ok ? "ok" : "err"}`} role="status" style={{ marginTop: 14 }}>{orderMsg.text}</div>}
        <button className="btn btn-ink" style={{ marginTop: 16 }} disabled={orderBusy || items.length === 0 || (fulfilment === "DELIVERY" && address.trim().length < 10)} onClick={() => order(false)}>
          {orderBusy ? "Placing..." : items.length ? `Place order · ${inr(subtotal)} before discount` : "Place order"}
        </button>
        {payCfg.data?.enabled && (
          <button className="btn btn-quiet" style={{ marginTop: 10 }} disabled={orderBusy || items.length === 0 || (fulfilment === "DELIVERY" && address.trim().length < 10)} onClick={() => order(true)}>
            Pay online (Razorpay test)
          </button>
        )}
        </div>
      </section>
    </div>
  );
}
