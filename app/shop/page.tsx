"use client";
import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { inr } from "@/lib/format";
import { payOnlineWithRazorpay } from "@/lib/pay-online";
import { Loading, ErrorBox, Empty } from "@/components/States";

const methods = [
  { code: "CASH", label: "Cash" },
  { code: "CARD", label: "Card" },
  { code: "UPI", label: "UPI" },
] as const;

export default function Shop() {
  const products = useApi(() => api.products("GEAR"));
  const [cart, setCart] = useState<Record<number, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [staffOrders, setStaffOrders] = useState<import("@/lib/types").OrderDTO[] | null>(null);
  const [payMethod, setPayMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [fulfilment, setFulfilment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = useApi(
    () => (name.trim().length >= 3 ? api.lookupMember(name.trim()) : Promise.resolve({ member: null })),
    [name],
  );
  const payCfg = useApi(() => api.payConfig(), []);

  useEffect(() => {
    api.me()
      .then((r) => {
        if (r.staff.role === "OWNER" || r.staff.role === "SHOP") return api.orders();
        return null;
      })
      .then((o) => setStaffOrders(o))
      .catch(() => setStaffOrders(null));
  }, []);
  const member = lookup.data?.member ?? null;
  const discountPct = member && member.state === "active" ? member.shopDiscount : 0;

  const gear = products.data ?? [];
  const subtotal = gear.reduce((s, p) => s + (cart[p.id] ?? 0) * p.price, 0);
  const discount = Math.round((subtotal * discountPct) / 100);
  const total = subtotal - discount;
  const count = gear.reduce((s, p) => s + (cart[p.id] ?? 0), 0);
  const set = (id: number, qty: number, stock: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(stock, qty)) }));

  async function order() {
    if (!total && !subtotal) return;
    setBusy(true);
    setMsg(null);
    try {
      const items = gear.filter((p) => (cart[p.id] ?? 0) > 0).map((p) => ({ productId: p.id, qty: cart[p.id] }));
      const r = await api.createOrder({ items, name: name.trim(), phone: phone.trim(), payMethod, fulfilment, address: fulfilment === "DELIVERY" ? address.trim() : undefined });
      setCart({});
      setMsg({
        ok: true,
        text: fulfilment === "DELIVERY"
          ? `Order placed, ${inr(r.total)}${r.discount ? ` (member discount ${inr(r.discount)} applied)` : ""}. We will deliver it to your address.`
          : `Order placed, ${inr(r.total)}${r.discount ? ` (member discount ${inr(r.discount)} applied)` : ""}. We will keep it at the front desk for pickup.`,
      });
      void products.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Order failed. Try again." });
      void products.reload();
    } finally {
      setBusy(false);
    }
  }

  async function orderOnline() {
    if (!total && !subtotal) return;
    const keyId = payCfg.data?.keyId;
    if (!keyId) return;
    setBusy(true);
    setMsg(null);
    try {
      const items = gear.filter((p) => (cart[p.id] ?? 0) > 0).map((p) => ({ productId: p.id, qty: cart[p.id] }));
      const r = await api.createOrder({ items, name: name.trim(), phone: phone.trim(), payMethod, fulfilment, address: fulfilment === "DELIVERY" ? address.trim() : undefined, payOnline: true });
      setCart({});
      const outcome = await payOnlineWithRazorpay(r, keyId);
      setMsg(outcome === "paid"
        ? { ok: true, text: `Paid online, ${inr(r.total)}${r.discount ? ` (member discount ${inr(r.discount)} applied)` : ""}. ${fulfilment === "DELIVERY" ? "We will deliver it to your address." : "We will keep it at the front desk for pickup."}` }
        : { ok: false, text: "Payment window closed before paying. The order is saved as pending — the desk can take payment at the counter." });
      void products.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Online payment failed. Try again, or pay at the counter." });
      void products.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Pro shop</p>
        <h1 className="page-title">Club shop</h1>
        <p className="sub">The same shelf as the counter. What is listed here is what is actually in stock.</p>
      </div>

      {products.loading ? (
        <Loading />
      ) : products.error ? (
        <ErrorBox message={products.error} onRetry={products.reload} />
      ) : gear.length === 0 ? (
        <Empty>The shelf is empty right now. New stock lands at the front desk first.</Empty>
      ) : (
        <>
          <div className="shop-grid">
            {gear.map((p) => (
              <div className={`product-card${p.stock === 0 ? " out" : ""}${(cart[p.id] ?? 0) > 0 ? " picked" : ""}`} key={p.id}>
                <p className="p-name">{p.name}</p>
                <p className={`stock-line${p.stock === 0 ? " out" : p.stock !== null && p.stock <= p.lowAt ? " low" : ""}`}>
                  {p.stock === 0 ? "Out of stock" : p.stock !== null && p.stock <= p.lowAt ? `Only ${p.stock} left` : `${p.stock} in stock`}
                </p>
                <p className="p-price">{inr(p.price)}</p>
                <div className="p-foot">
                  <span className="muted">{(cart[p.id] ?? 0) > 0 ? <><span className="num">{inr((cart[p.id] ?? 0) * p.price)}</span> in your order</> : "Pick a quantity"}</span>
                  <div className="stepper">
                    <button aria-label={`One less ${p.name}`} disabled={!(cart[p.id] ?? 0)} onClick={() => set(p.id, (cart[p.id] ?? 0) - 1, p.stock ?? 0)}>−</button>
                    <b className="num">{cart[p.id] ?? 0}</b>
                    <button aria-label={`One more ${p.name}`} disabled={p.stock === 0 || (cart[p.id] ?? 0) >= (p.stock ?? 0)} onClick={() => set(p.id, (cart[p.id] ?? 0) + 1, p.stock ?? 0)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="panel panel-main" style={{ marginTop: 24 }}>
          <div className="field-row" style={{ maxWidth: 640 }}>
            <div>
              <label htmlFor="s-name">Your name</label>
              <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Members: use your registered name" />
              {name.trim().length >= 3 && !lookup.loading && member ? (
                <p className={`member-strip${member.state === "active" ? "" : " warn"}`} role="status">
                  {member.state === "active"
                    ? `${member.name}, ${member.plan} plan, ${member.shopDiscount}% off in the shop.`
                    : `${member.name}, ${member.plan} plan, ${member.state}. Discounts pause while the plan is not active.`}
                </p>
              ) : name.trim().length >= 3 && !lookup.loading ? (
                <p className="muted" style={{ marginTop: 6 }} role="status">No member with that name. Walk-in prices apply.</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="s-phone">Phone (for {fulfilment === "DELIVERY" ? "delivery" : "pickup"})</label>
              <input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="So the desk can call you" />
            </div>
            <div>
              <label>Pickup or delivery</label>
              <div className="seg" role="group" aria-label="Pickup or delivery">
                <button aria-pressed={fulfilment === "PICKUP"} onClick={() => setFulfilment("PICKUP")}>Pickup</button>
                <button aria-pressed={fulfilment === "DELIVERY"} onClick={() => setFulfilment("DELIVERY")}>Delivery</button>
              </div>
            </div>
            {fulfilment === "DELIVERY" && (
              <div>
                <label htmlFor="s-address">Delivery address</label>
                <input id="s-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat, street, landmark" />
              </div>
            )}
            <div>
              <label>Paying by</label>
              <div className="seg" role="group" aria-label="Payment method">
                {methods.map((m) => (
                  <button key={m.code} aria-pressed={payMethod === m.code} onClick={() => setPayMethod(m.code)}>{m.label}</button>
                ))}
              </div>
            </div>
          </div>

          {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}
          </div>

          {staffOrders && staffOrders.length > 0 && (
            <section className="block">
              <div className="sec-head"><h2>Today&apos;s orders (staff)</h2></div>
              <div className="rows">
                {staffOrders.map((o) => (
                  <div className="row-item" key={o.id}>
                    <div className="row-main">
                      <p className="row-name">{o.name} <span className="muted" style={{ fontWeight: 400 }}>{o.phone}</span>{o.fulfilment === "DELIVERY" && <span className="tag" style={{ marginLeft: 8 }}>Delivery</span>}</p>
                      <p className="muted">{o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}{o.fulfilment === "DELIVERY" && o.address ? ` · ${o.address}` : ""}</p>
                    </div>
                    <span className="num">{inr(o.total)} · {o.payMethod === "ONLINE" ? (o.payState === "PAID" ? "Online, paid" : "Online, pending") : o.payMethod}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="summary">
            <p className="s-lines">
              {count === 0 ? (
                "Nothing picked yet."
              ) : (
                <>
                  {count} item{count > 1 ? "s" : ""} · <span className="num">{inr(subtotal)}</span>
                  {discount > 0 ? <> · discount <span className="num">−{inr(discount)}</span></> : ""} ·{" "}
                  <span className="num s-total">{inr(total)}</span>
                </>
              )}
            </p>
            <button className="btn btn-ink" disabled={!subtotal || !name.trim() || phone.replace(/\D/g, "").length < 10 || (fulfilment === "DELIVERY" && address.trim().length < 10) || busy} onClick={order}>
              {busy ? "Placing order..."
                : !subtotal ? "Add something first"
                : !name.trim() ? "Enter your name"
                : phone.replace(/\D/g, "").length < 10 ? "Enter 10-digit phone"
                : fulfilment === "DELIVERY" && address.trim().length < 10 ? "Add the delivery address"
                : `Order for ${fulfilment === "DELIVERY" ? "delivery" : "pickup"}, ${inr(total)}`}
            </button>
            {payCfg.data?.enabled && (
              <button className="btn btn-quiet" style={{ marginTop: 10 }} disabled={!subtotal || !name.trim() || phone.replace(/\D/g, "").length < 10 || (fulfilment === "DELIVERY" && address.trim().length < 10) || busy} onClick={orderOnline}>
                Pay online (Razorpay test), {inr(total)}
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}
