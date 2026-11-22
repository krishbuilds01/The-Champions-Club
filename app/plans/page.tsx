"use client";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { inr } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";

// Public plans page: every price on it comes live from GET /plans.
// Nothing is hard-coded — if the plans cannot be loaded, the page
// says so instead of showing stale numbers.
export default function Plans() {
  const plans = useApi(() => api.plans(), []);
  const list = plans.data ?? [];

  return (
    <main className="shop-page">
      <section className="shop-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.jpg" alt="Tennis player on court at Champions Club" className="shop-hero-img" />
        <div className="shop-hero-shade" />
        <div className="wrap shop-hero-in">
          <p className="shop-eyebrow">Membership · Gold · Silver · Junior</p>
          <h1 className="shop-title">Memberships</h1>
          <p className="shop-sub">Member rates on court, savings in the shop and at the bar, and priority booking — pick the plan that fits how often you play.</p>
          <div className="shop-hero-chips">
            <span>Member court rates</span>
            <span>Shop &amp; bar discounts</span>
            <span>Under-18s save with Junior</span>
          </div>
        </div>
      </section>

      <div className="wrap page shop-body">
        {plans.loading ? (
          <Loading />
        ) : plans.error ? (
          <ErrorBox message={plans.error} onRetry={plans.reload} />
        ) : list.length === 0 ? (
          <Empty>No membership plans are listed right now. Please check back soon.</Empty>
        ) : (
          <>
            <div className="plan-grid">
              {list.map((p) => {
                const from = Math.min(p.tennisPrice, p.cricketPrice);
                const gold = p.code === "gold";
                return (
                  <article className={`plan-card${gold ? " plan-gold" : ""}`} key={p.code}>
                    {gold && <p className="plan-flag">Most popular</p>}
                    <h2 className="plan-name">{p.name}</h2>
                    <p className="plan-from">
                      From <span className="num">{inr(from)}</span> a session
                    </p>
                    <ul className="plan-perks">
                      <li>Tennis court <span className="num">{inr(p.tennisPrice)}</span> / hour</li>
                      <li>Cricket court <span className="num">{inr(p.cricketPrice)}</span> / hour</li>
                      <li>Save {p.shopDiscount}% in the pro shop</li>
                      <li>Save {p.barDiscount}% at the bar &amp; café</li>
                      <li>{p.termDays} days of membership</li>
                      {p.code === "junior" && <li>For players under 18</li>}
                    </ul>
                    <Link href="/trial" className="btn btn-ink plan-cta">Book a free trial</Link>
                  </article>
                );
              })}
            </div>
            <p className="sub" style={{ marginTop: 24, textAlign: "center" }}>
              Not sure which plan fits?{" "}
              <a className="text-link" href="mailto:frontdesk@champions.club">Ask the front desk</a>{" "}
              or <Link className="text-link" href="/trial">try a session first</Link> — it is free.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
