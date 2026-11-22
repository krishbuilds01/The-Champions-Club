import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentMember } from "@/lib/auth";
import { memberHome, renewMember } from "@/lib/services/members";
import { fmtTime, inr } from "@/lib/format";
import MemberBar from "@/components/MemberBar";
import MemberActions from "@/components/MemberActions";

// The member's own page: plan and expiry up top, then their bookings,
// shop orders and bar tabs. Reads are server-rendered off the member
// record; booking and ordering post back to the member routes.
// Renewing from the portal is a server action, not a fetch: the page
// is server-rendered and the member's identity comes from the session.
// It calls the same renewMember service as the desk and member routes.
async function renewPlan() {
  "use server";
  const session = await currentMember();
  if (!session) redirect("/member/login");
  await renewMember(session.id);
  revalidatePath("/member");
  redirect("/member?renewed=1");
}

export default async function MemberHome({ searchParams }: { searchParams?: Promise<{ renewed?: string }> }) {
  const session = await currentMember();
  if (!session) redirect("/member/login");
  const home = await memberHome(session.id);
  const m = home.member;
  const renewed = (await searchParams)?.renewed === "1";

  return (
    <main className="wrap page">
      <div className="page-head">
        <h1 className="page-title">My club</h1>
        <p className="sub">Your plan, your bookings, your orders.</p>
      </div>
      <MemberBar name={m.name} plan={m.plan} />

      <section className="panel panel-main" aria-label="My plan">
        <div className="figures" style={{ marginTop: 0 }}>
          <div className="figure">
            <div className="f-label">{m.plan} plan</div>
            <div className="f-value">{m.state === "expired" ? "Expired" : m.state === "expiring" ? "Expiring soon" : "Active"}</div>
          </div>
          <div className="figure">
            <div className="f-label">{m.state === "expired" ? "Expired on" : "Runs until"}</div>
            <div className="f-value">{m.expiresOn}</div>
          </div>
          <div className="figure">
            <div className="f-label">Bookings standing</div>
            <div className="f-value">{home.bookings.filter((b) => b.state === "BOOKED").length}</div>
          </div>
        </div>
        {m.state !== "active" && (
          <p className="notice" style={{ marginTop: 14 }}>
            {m.state === "expired"
              ? "Your plan has expired — the front desk can renew it in a minute, and bookings open up again straight away."
              : "Your plan runs out soon — a quick word with the front desk keeps everything running."}
          </p>
        )}
        {renewed && (
          <p className="notice ok" role="status" style={{ marginTop: 14 }}>
            Renewed — your plan now runs until {m.expiresOn}.
          </p>
        )}
        <form action={renewPlan} style={{ marginTop: 14 }}>
          <button className="btn btn-ink" type="submit">Renew my plan</button>
        </form>
        <p className="muted" style={{ marginTop: 8 }}>Renews from the later of today and your current end date — you never lose days.</p>
      </section>

      <MemberActions />

      <section style={{ marginTop: 30 }} aria-label="My bookings">
        <div className="sec-head"><h2>My bookings</h2></div>
        {home.bookings.length === 0 ? (
          <p className="empty">No bookings yet.</p>
        ) : (
          <div className="ledger-wrap">
            <table className="ledger">
              <thead><tr><th>Date</th><th>Time</th><th>Court</th><th className="r">Price</th><th>Status</th></tr></thead>
              <tbody>
                {home.bookings.map((b) => (
                  <tr key={b.id} className={b.state === "CANCELLED" ? "row-off" : undefined}>
                    <td>{b.date}</td>
                    <td>{fmtTime(b.start)}</td>
                    <td>{b.court}</td>
                    <td className="r">{b.price === 0 ? (b.type === "TRIAL" ? "Free trial" : "Covered by plan") : inr(b.price)}</td>
                    <td><span className={`status ${b.state === "BOOKED" ? "booked" : "cancelled"}`}>{b.state === "BOOKED" ? "Booked" : "Cancelled"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 30 }} aria-label="My shop orders">
        <div className="sec-head"><h2>My shop orders</h2></div>
        {home.orders.length === 0 ? (
          <p className="empty">No orders yet.</p>
        ) : (
          <div className="ledger-wrap">
            <table className="ledger">
              <thead><tr><th>Order</th><th>Date</th><th className="hide-m">Paid by</th><th className="r">Total</th></tr></thead>
              <tbody>
                {home.orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}{o.fulfilment === "DELIVERY" ? " · Delivery" : ""}</td>
                    <td>{o.createdAt.slice(0, 10)}</td>
                    <td className="hide-m">{o.payMethod === "ONLINE" ? `Online · ${o.payState === "PAID" ? "paid" : "pending"}` : o.payMethod}</td>
                    <td className="r">{inr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 30 }} aria-label="My bar tabs">
        <div className="sec-head"><h2>My bar tabs</h2></div>
        {home.tabs.length === 0 ? (
          <p className="empty">No bar tabs yet.</p>
        ) : (
          <div className="ledger-wrap">
            <table className="ledger">
              <thead><tr><th>Tab</th><th className="r">Total</th><th>Status</th></tr></thead>
              <tbody>
                {home.tabs.map((t) => (
                  <tr key={t.id}>
                    <td>{t.items.length ? t.items.map((i) => `${i.name} ×${i.qty}`).join(", ") : "Nothing added yet"}</td>
                    <td className="r">{inr(t.total)}</td>
                    <td><span className={`status ${t.status === "OPEN" ? "booked" : ""}`}>{t.status === "OPEN" ? "Open" : `Settled · ${t.payMethod}`}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
