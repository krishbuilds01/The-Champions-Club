"use client";

// The landing page, implemented from the user's Figma Make design
// ("Sports Club Management System").
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import DemoRazorpayModal from "@/components/DemoRazorpayModal";
import type { MemberSessionDTO } from "@/lib/types";

type IconName = "arrow" | "menu" | "close" | "court" | "cup" | "bag" | "clock" | "pin" | "instagram";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    court: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M12 4v16M3 12h18M8 4v4M16 16v4" /></>,
    cup: <><path d="M5 4h14l-2 8a5 5 0 0 1-10 0L5 4ZM12 17v4M8 21h8" /></>,
    bag: <><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const facilities = [
  { number: "01", title: "Courts", description: "Three championship courts — two tennis, one cricket — thoughtfully designed for every level of play.", icon: "court" as IconName, meta: "3 courts · Tennis & cricket", href: "/courts" },
  { number: "02", title: "Clubhouse", description: "A relaxed bar and kitchen serving all-day plates, considered drinks, and post-match rituals.", icon: "cup" as IconName, meta: "Open until late", href: "/bar" },
  { number: "03", title: "Pro shop", description: "Technical essentials, fresh club apparel, and expert advice—all right where you play.", icon: "bag" as IconName, meta: "Curated for players", href: "/shop" },
];

export default function Home() {
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [member, setMember] = useState<MemberSessionDTO | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    api.memberMe()
      .then((r) => setMember(r.member))
      .catch(() => setMember(null));
  }, []);

  async function handleMemberLogout() {
    await api.memberLogout().catch(() => {});
    setMember(null);
    setNotice("Signed out");
    window.setTimeout(() => setNotice(""), 2000);
  }

  const [razorpayPlan, setRazorpayPlan] = useState<{
    isOpen: boolean;
    planCode: string;
    amount: number;
    title: string;
  }>({
    isOpen: false,
    planCode: "",
    amount: 0,
    title: "",
  });

  async function handleSelectPlan(planCode: string) {
    if (!member) {
      window.location.href = `/member-login?tab=signup&plan=${planCode}`;
      return;
    }
    const amounts: Record<string, number> = { gold: 1500, silver: 1000, junior: 600 };
    const titles: Record<string, string> = { gold: "Gold Tier", silver: "Silver Tier", junior: "Junior Tier" };
    setRazorpayPlan({
      isOpen: true,
      planCode,
      amount: amounts[planCode] ?? 1000,
      title: titles[planCode] ?? "Club Membership",
    });
  }

  async function executePlanPayment(planCode: string) {
    setActivating(planCode);
    setRazorpayPlan((p) => ({ ...p, isOpen: false }));
    try {
      await api.buyPlan(planCode);
      const res = await api.memberMe();
      setMember(res.member);
      setNotice(`Activated ${planCode.toUpperCase()} membership via Demo Razorpay!`);
      window.setTimeout(() => setNotice(""), 2500);
      window.location.href = "/courts";
    } catch {
      setNotice("Failed to activate plan");
      window.setTimeout(() => setNotice(""), 2500);
    } finally {
      setActivating(null);
    }
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="make-landing min-h-screen bg-[#f2f0e8] text-[#163021]">
      <main>
        <section id="home" className="relative flex min-h-[760px] items-end overflow-hidden bg-[#10251a] text-white -mt-[74px] pt-36 lg:min-h-screen">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero.jpg" alt="Tennis player on court at Champions Club" className="absolute inset-0 h-full w-full object-cover object-[62%_center]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,28,17,.94)_0%,rgba(9,30,18,.74)_35%,rgba(9,29,18,.1)_70%),linear-gradient(0deg,rgba(7,23,14,.72)_0%,transparent_45%)]" />
          <div className="relative mx-auto w-full max-w-[1440px] px-5 pb-16 pt-36 sm:px-8 lg:px-12 lg:pb-20">
            <div className="max-w-[720px]">
              <div className="mb-7 flex items-center gap-3"><span className="h-px w-10 bg-[#dfff45]" /><span className="text-[10px] font-bold uppercase tracking-[.28em] text-[#dfff45]">Courts · Kitchen · Community</span></div>
              <h1 className="font-display text-[64px] font-bold uppercase leading-[.84] tracking-[-.035em] sm:text-[86px] lg:text-[118px]">Play hard.<br /><span className="text-[#dfff45]">Stay longer.</span></h1>
              <p className="mt-8 max-w-lg text-sm leading-7 text-white/70 sm:text-base">More than a place to play. Champions is your home court, your local, and your community—all under one roof.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                {member ? (
                  <Link href="/courts" className="group flex items-center gap-5 rounded-full bg-[#dfff45] px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#163021] transition hover:bg-white">
                    View Courts &amp; Book <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
                ) : (
                  <Link href="/member-login?tab=signup" className="group flex items-center gap-5 rounded-full bg-[#dfff45] px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#163021] transition hover:bg-white">
                    Join the club <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
                )}
                <Link href="/trial" className="rounded-full border border-white/35 px-6 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-[#163021]">Book a trial</Link>
                <Link href="/courts" className="rounded-full border border-white/35 px-6 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-[#163021]">Courts</Link>
                <button onClick={() => scrollTo("membership")} className="rounded-full border border-white/35 px-6 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-[#163021]">Membership</button>
              </div>
            </div>
            <div className="mt-16 flex flex-wrap gap-x-12 gap-y-5 border-t border-white/20 pt-6 text-[10px] uppercase tracking-[.18em] text-white/55 lg:absolute lg:bottom-20 lg:right-12 lg:mt-0 lg:w-auto">
              <span className="flex items-center gap-2"><Icon name="clock" className="h-4 w-4 text-[#dfff45]" />Open daily 6 AM – 10 PM</span>
            </div>
          </div>
        </section>

        <section id="club" className="overflow-hidden py-24 sm:py-32">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
              <div><p className="eyebrow">A different kind of club</p><div className="mt-8 hidden h-28 w-px bg-[#b7c0b7] lg:block" /></div>
              <div>
                <h2 className="font-display text-5xl font-bold uppercase leading-[.93] tracking-tight sm:text-7xl">Built around the game.<br /><span className="text-[#7c887e]">Made for everything after.</span></h2>
                <p className="mt-8 max-w-2xl text-base leading-8 text-[#617065]">Come for a quick set. Stay for lunch, catch up over a drink, or meet the people who turn a match into a weekly ritual. Champions brings sport and hospitality together, without the old club rules.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="play" className="bg-[#173021] py-20 text-white sm:py-28">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
            <div className="mb-14 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div><p className="eyebrow text-[#dfff45]">Everything in one place</p><h2 className="mt-4 font-display text-5xl font-bold uppercase sm:text-6xl">Your club, your way.</h2></div>
              <p className="max-w-sm text-sm leading-6 text-white/50">Designed to move seamlessly from first serve to last orders.</p>
            </div>
            <div className="grid border-y border-white/15 md:grid-cols-3 md:divide-x md:divide-white/15">
              {facilities.map((facility) => (
                <Link href={facility.href} key={facility.title} className="group block border-b border-white/15 py-8 last:border-b-0 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0 lg:px-10">
                  <div className="mb-16 flex items-start justify-between"><span className="text-[10px] font-bold tracking-[.2em] text-white/35">{facility.number}</span><div className="grid h-12 w-12 place-items-center rounded-full border border-white/20 text-[#dfff45] transition group-hover:border-[#dfff45] group-hover:bg-[#dfff45] group-hover:text-[#173021]"><Icon name={facility.icon} /></div></div>
                  <h3 className="font-display text-4xl font-bold uppercase">{facility.title}</h3>
                  <p className="mt-4 min-h-[72px] text-sm leading-6 text-white/55">{facility.description}</p>
                  <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5"><span className="text-[10px] font-bold uppercase tracking-wider text-[#dfff45]">{facility.meta}</span><Icon name="arrow" className="h-4 w-4 text-white/30 transition group-hover:translate-x-1 group-hover:text-white" /></div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="clubhouse" className="grid min-h-[620px] lg:grid-cols-2">
          <div className="clubhouse-art relative min-h-[420px] overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(140deg,transparent_40%,rgba(9,30,18,.35))]" />
            <div className="absolute bottom-7 left-7 rounded-full border border-white/30 bg-black/15 px-4 py-2 text-[9px] font-bold uppercase tracking-[.2em] text-white backdrop-blur">Open to everyone</div>
          </div>
          <div className="flex items-center bg-[#dfff45] px-7 py-20 sm:px-14 lg:px-20">
            <div className="max-w-xl">
              <p className="eyebrow">The clubhouse</p>
              <h2 className="mt-5 font-display text-6xl font-bold uppercase leading-[.88] tracking-tight sm:text-7xl">Good games.<br />Better company.</h2>
              <p className="mt-7 max-w-md text-sm leading-7 text-[#405143]">Our bar and kitchen is made for the full day—from the first flat white to the last round. Seasonal plates, cold drinks, and the best seat in the house for watching the action.</p>
              <Link href="/bar" className="mt-9 flex w-fit items-center gap-5 rounded-full bg-[#173021] px-6 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-[#173021]">Meet at the bar <Icon name="arrow" className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section id="membership" className="bg-[#f2f0e8] py-24 sm:py-32">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow">Membership Tiers &amp; Player Returns</p>
              <h2 className="mt-4 font-display text-5xl font-bold uppercase leading-[.92] tracking-tight sm:text-7xl">
                Make Champions<br /><span className="text-[#7c887e]">your home court.</span>
              </h2>
              <p className="mt-6 text-sm sm:text-base leading-7 text-[#68746b]">
                Priority court booking, exclusive member rates, and guaranteed player savings.
                Explore the 1-month profits below—every plan pays for itself in just a few visits.
              </p>
            </div>

            {/* 3 Membership Cards */}
            <div className="mt-16 grid gap-8 lg:grid-cols-3 items-stretch">
              {/* CARD 1: GOLD */}
              <div className="relative flex flex-col justify-between rounded-3xl bg-[#163021] p-7 text-white shadow-xl sm:p-9 ring-2 ring-[#dfff45]">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#dfff45] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-[#163021] shadow">
                  ⭐ Most Popular · Max Savings
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-3xl font-bold uppercase text-white">Gold Tier</h3>
                      <p className="text-xs text-white/60 mt-1">For regular players &amp; active teams</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#dfff45]">
                      All-Access
                    </span>
                  </div>

                  <div className="mt-6 border-b border-white/15 pb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-5xl font-bold text-[#dfff45]">₹1,500</span>
                      <span className="text-sm font-semibold uppercase tracking-wider text-white/60">/ month</span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/50">or ₹15,000 / year (save ₹3,000 yearly)</p>
                  </div>

                  {/* Hourly Rates & Benefits */}
                  <div className="mt-6 space-y-3 text-xs">
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5">
                      <span className="text-white/80">🎾 Tennis Court</span>
                      <span className="font-bold text-[#dfff45]">₹300/hr <span className="font-normal text-white/40 line-through text-[10px]">₹500</span></span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5">
                      <span className="text-white/80">🏏 Cricket Turf</span>
                      <span className="font-bold text-[#dfff45]">₹500/hr <span className="font-normal text-white/40 line-through text-[10px]">₹800</span></span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5">
                      <span className="text-white/80">☕ Clubhouse Bar &amp; Café</span>
                      <span className="font-bold text-white">20% OFF Everything</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5">
                      <span className="text-white/80">🛍️ Pro Shop &amp; Gear</span>
                      <span className="font-bold text-white">15% OFF Equipment</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5">
                      <span className="text-white/80">📅 Booking Window</span>
                      <span className="font-bold text-white">7 Days in Advance</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5">
                      <span className="text-white/80">⏱️ Daily Court Limit</span>
                      <span className="font-bold text-[#dfff45]">Up to 4 Slots (4 hrs / day)</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5">
                      <span className="text-white/80">🎟️ Free Guest Passes</span>
                      <span className="font-bold text-[#dfff45]">2 Passes / Month</span>
                    </div>
                  </div>

                  {/* 1-Month Profit Box */}
                  <div className="mt-7 rounded-2xl bg-[#dfff45]/10 border border-[#dfff45]/25 p-4 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#dfff45]">
                      📊 1-Month Member Profits:
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      Save ₹3,600/mo <span className="text-[#dfff45]">(Net Profit +₹2,100)</span>
                    </p>
                    <ul className="mt-2.5 space-y-1.5 text-[11px] text-white/70">
                      <li className="flex items-center gap-2">✓ 4 Tennis matches: Save ₹800</li>
                      <li className="flex items-center gap-2">✓ 2 Cricket games: Save ₹600</li>
                      <li className="flex items-center gap-2">✓ 2 Free guest passes: Worth ₹1,000</li>
                      <li className="flex items-center gap-2">✓ Café &amp; Shop discount: Save ~₹1,200</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8">
                  {member?.plan?.code === "gold" ? (
                    <div className="w-full rounded-full bg-white/20 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-white">
                      Current Plan ✓
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan("gold")}
                      disabled={activating === "gold"}
                      className="w-full rounded-full bg-[#dfff45] py-3.5 text-center text-xs font-bold uppercase tracking-wider text-[#163021] transition hover:bg-white"
                    >
                      {activating === "gold" ? "Activating..." : member ? "Activate Gold (₹1,500/mo)" : "Join Gold Membership"}
                    </button>
                  )}
                </div>
              </div>

              {/* CARD 2: SILVER */}
              <div className="flex flex-col justify-between rounded-3xl bg-white p-7 text-[#163021] border border-[#163021]/15 shadow-sm sm:p-9">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-3xl font-bold uppercase text-[#163021]">Silver Tier</h3>
                      <p className="text-xs text-[#617065] mt-1">For regular weekly players</p>
                    </div>
                    <span className="rounded-full bg-[#163021]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#163021]">
                      Club Favourite
                    </span>
                  </div>

                  <div className="mt-6 border-b border-[#163021]/10 pb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-5xl font-bold text-[#163021]">₹1,000</span>
                      <span className="text-sm font-semibold uppercase tracking-wider text-[#617065]">/ month</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#849087]">or ₹10,000 / year (save ₹2,000 yearly)</p>
                  </div>

                  {/* Hourly Rates & Benefits */}
                  <div className="mt-6 space-y-3 text-xs">
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">🎾 Tennis Court</span>
                      <span className="font-bold text-[#163021]">₹400/hr <span className="font-normal text-[#849087] line-through text-[10px]">₹500</span></span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">🏏 Cricket Turf</span>
                      <span className="font-bold text-[#163021]">₹650/hr <span className="font-normal text-[#849087] line-through text-[10px]">₹800</span></span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">☕ Clubhouse Bar &amp; Café</span>
                      <span className="font-bold text-[#163021]">10% OFF Everything</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">🛍️ Pro Shop &amp; Gear</span>
                      <span className="font-bold text-[#163021]">10% OFF Equipment</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">📅 Booking Window</span>
                      <span className="font-bold text-[#163021]">5 Days in Advance</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">⏱️ Daily Court Limit</span>
                      <span className="font-bold text-[#163021]">Up to 2 Slots (2 hrs / day)</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">🎟️ Free Guest Passes</span>
                      <span className="font-bold text-[#163021]">1 Pass / Month</span>
                    </div>
                  </div>

                  {/* 1-Month Profit Box */}
                  <div className="mt-7 rounded-2xl bg-[#163021]/5 border border-[#163021]/10 p-4 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#163021]">
                      📊 1-Month Member Profits:
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#163021]">
                      Save ₹1,650/mo <span className="text-[#2e7d32]">(Net Profit +₹650)</span>
                    </p>
                    <ul className="mt-2.5 space-y-1.5 text-[11px] text-[#617065]">
                      <li className="flex items-center gap-2">✓ 4 Tennis matches: Save ₹400</li>
                      <li className="flex items-center gap-2">✓ 1 Cricket match: Save ₹150</li>
                      <li className="flex items-center gap-2">✓ 1 Free guest pass: Worth ₹500</li>
                      <li className="flex items-center gap-2">✓ Café &amp; Shop discount: Save ~₹600</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8">
                  {member?.plan?.code === "silver" ? (
                    <div className="w-full rounded-full bg-[#163021]/15 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-[#163021]">
                      Current Plan ✓
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan("silver")}
                      disabled={activating === "silver"}
                      className="w-full rounded-full bg-[#163021] py-3.5 text-center text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#dfff45] hover:text-[#163021]"
                    >
                      {activating === "silver" ? "Activating..." : member ? "Activate Silver (₹1,000/mo)" : "Join Silver Membership"}
                    </button>
                  )}
                </div>
              </div>

              {/* CARD 3: JUNIOR */}
              <div className="flex flex-col justify-between rounded-3xl bg-white p-7 text-[#163021] border border-[#163021]/15 shadow-sm sm:p-9">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-3xl font-bold uppercase text-[#163021]">Junior Tier</h3>
                      <p className="text-xs text-[#617065] mt-1">Under 18, Students &amp; Youth</p>
                    </div>
                    <span className="rounded-full bg-[#163021]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#163021]">
                      Youth 50% Off
                    </span>
                  </div>

                  <div className="mt-6 border-b border-[#163021]/10 pb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-5xl font-bold text-[#163021]">₹600</span>
                      <span className="text-sm font-semibold uppercase tracking-wider text-[#617065]">/ month</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#849087]">or ₹6,000 / year (save ₹1,200 yearly)</p>
                  </div>

                  {/* Hourly Rates & Benefits */}
                  <div className="mt-6 space-y-3 text-xs">
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">🎾 Tennis Court</span>
                      <span className="font-bold text-[#2e7d32]">₹250/hr <span className="font-normal text-[#849087] line-through text-[10px]">₹500</span> (50% Off)</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">🏏 Cricket Turf</span>
                      <span className="font-bold text-[#2e7d32]">₹400/hr <span className="font-normal text-[#849087] line-through text-[10px]">₹800</span> (50% Off)</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">🛍️ Pro Shop Gear</span>
                      <span className="font-bold text-[#163021]">5% OFF Training Gear</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">🏆 Skills Workshop</span>
                      <span className="font-bold text-[#163021]">Free Monthly Clinic</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">📅 Booking Window</span>
                      <span className="font-bold text-[#163021]">3 Days in Advance</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">⏱️ Daily Court Limit</span>
                      <span className="font-bold text-[#2e7d32]">1 Slot (1 hr / day)</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#f7f6f0] px-3.5 py-2.5">
                      <span className="text-[#617065]">⏰ Afternoon Priority</span>
                      <span className="font-bold text-[#163021]">2 PM – 6 PM Slots</span>
                    </div>
                  </div>

                  {/* 1-Month Profit Box */}
                  <div className="mt-7 rounded-2xl bg-[#163021]/5 border border-[#163021]/10 p-4 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#163021]">
                      📊 1-Month Member Profits:
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#163021]">
                      Save ₹2,500/mo <span className="text-[#2e7d32]">(Net Profit +₹1,900)</span>
                    </p>
                    <ul className="mt-2.5 space-y-1.5 text-[11px] text-[#617065]">
                      <li className="flex items-center gap-2">✓ 6 Tennis practice hrs: Save ₹1,500</li>
                      <li className="flex items-center gap-2">✓ 1 Cricket turf game: Save ₹400</li>
                      <li className="flex items-center gap-2">✓ Free monthly skills clinic: Worth ₹600</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8">
                  {member?.plan?.code === "junior" ? (
                    <div className="w-full rounded-full bg-[#163021]/15 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-[#163021]">
                      Current Plan ✓
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan("junior")}
                      disabled={activating === "junior"}
                      className="w-full rounded-full bg-[#163021] py-3.5 text-center text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#dfff45] hover:text-[#163021]"
                    >
                      {activating === "junior" ? "Activating..." : member ? "Activate Junior (₹600/mo)" : "Join Junior Membership"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Custom / Corporate Enquiry Bar */}
            <div className="mt-20 rounded-3xl border border-[#163021]/15 bg-white p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-sm">
              <p className="eyebrow">Corporate &amp; Family Plans</p>
              <h3 className="mt-3 font-display text-3xl font-bold uppercase text-[#163021] sm:text-4xl">
                Need a Custom Club Package?
              </h3>
              <p className="mt-3 text-sm text-[#617065] max-w-md mx-auto">
                We offer custom corporate memberships, team packages, and private family arrangements with dedicated court booking privileges.
              </p>
              <div className="mx-auto mt-7 flex max-w-md rounded-full border border-[#163021]/15 bg-[#f7f6f0] p-1.5">
                <input
                  aria-label="Email address"
                  placeholder="Your corporate or family email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-5 text-sm outline-none placeholder:text-[#849087]"
                />
                <button
                  onClick={async () => {
                    const em = email.trim();
                    if (!em.includes("@")) { setNotice("Add an email address first"); return; }
                    try {
                      const res = await fetch("/api/v1/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Website visitor", contact: em, interest: "Custom Membership", message: "Custom corporate/family membership info requested" }) });
                      if (!res.ok) throw new Error();
                      setEmail("");
                      setNotice("Thanks — our membership manager will be in touch shortly");
                    } catch { setNotice("Could not send that — try again"); }
                  }}
                  className="rounded-full bg-[#163021] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#294d36]"
                >
                  Request Info
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#10251a] px-5 py-10 text-white sm:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-8 border-b border-white/10 pb-10 md:flex-row md:items-center">
          <Link href="/" className="font-display text-3xl font-bold uppercase">Champions <span className="text-[#dfff45]">Club.</span></Link>
          <div className="flex flex-wrap gap-7 text-xs text-white/55">
            <Link href="/courts" className="transition hover:text-white">Courts</Link>
            <Link href="/shop" className="transition hover:text-white">Shop</Link>
            <Link href="/bar" className="transition hover:text-white">Bar &amp; Café</Link>
            <Link href="/trial" className="transition hover:text-white">Book a trial</Link>
            <Link href="/#membership" className="transition hover:text-white">Membership</Link>
            <a href="mailto:frontdesk@champions.club" className="transition hover:text-white">Contact</a>
            <Icon name="instagram" className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="mx-auto mt-7 flex max-w-[1280px] flex-col items-center gap-3 text-center text-[9px] uppercase tracking-[.15em] text-white/30 sm:flex-row sm:justify-center sm:gap-10"><span>© 2026 Champions Club</span><span>Play · Eat · Belong</span></div>
      </footer>

      {notice && <div className="make-toast fixed bottom-5 right-5 z-50 rounded-full bg-white px-5 py-3 text-xs font-bold text-[#173021] shadow-2xl">{notice}</div>}

      <DemoRazorpayModal
        isOpen={razorpayPlan.isOpen}
        onClose={() => setRazorpayPlan((p) => ({ ...p, isOpen: false }))}
        onSuccess={() => executePlanPayment(razorpayPlan.planCode)}
        amount={razorpayPlan.amount}
        title={razorpayPlan.title}
        description="1 Month Full Membership Subscription"
        customerName={member?.name ?? "Club Member"}
        customerPhone={member?.phone ?? ""}
      />
    </div>
  );
}
