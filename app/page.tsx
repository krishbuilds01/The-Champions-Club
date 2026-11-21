"use client";

// The landing page, implemented exactly from the user's Figma Make design
// ("Sports Club Management System"). Only wiring differs: Member login goes
// to the real staff sign-in. Everything else keeps the design's behaviour.
import { useState } from "react";
import Link from "next/link";

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
  { number: "01", title: "Courts", description: "Six championship padel and tennis courts, thoughtfully designed for every level of play.", icon: "court" as IconName, meta: "6 premium courts", href: "/courts" },
  { number: "02", title: "Clubhouse", description: "A relaxed bar and kitchen serving all-day plates, considered drinks, and post-match rituals.", icon: "cup" as IconName, meta: "Open until late", href: "/bar" },
  { number: "03", title: "Pro shop", description: "Technical essentials, fresh club apparel, and expert advice—all right where you play.", icon: "bag" as IconName, meta: "Curated for players", href: "/shop" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }

  return (
    <div className="make-landing min-h-screen bg-[#f2f0e8] text-[#163021]">
      <header className="absolute inset-x-0 top-0 z-40 border-b border-white/15 text-white">
        <div className="mx-auto flex h-[84px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <button onClick={() => scrollTo("home")} className="flex items-center gap-3" aria-label="Champions Club home">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-[#dfff45]/80 font-display text-[17px] font-bold italic text-[#dfff45]">CC</div>
            <div className="text-left"><p className="font-display text-[19px] font-bold uppercase leading-none tracking-wide">Champions</p><p className="mt-1 text-[8px] font-semibold uppercase tracking-[.34em] text-white/55">The club</p></div>
          </button>
          <nav className="hidden items-center gap-8 lg:flex">
            <Link href="/courts" className="text-xs font-semibold text-white/75 transition hover:text-white">Courts</Link>
            <Link href="/shop" className="text-xs font-semibold text-white/75 transition hover:text-white">Shop</Link>
            <Link href="/bar" className="text-xs font-semibold text-white/75 transition hover:text-white">Bar &amp; Café</Link>
            <Link href="/trial" className="text-xs font-semibold text-white/75 transition hover:text-white">Book a trial</Link>
            <Link href="/#membership" className="text-xs font-semibold text-white/75 transition hover:text-white">Membership</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full bg-white px-4 py-2.5 sm:px-5 sm:py-3 text-[11px] font-bold uppercase tracking-wider text-[#173020] shadow-md transition hover:bg-[#dfff45]">Sign in</Link>
            <Link href="/trial" className="hidden rounded-full bg-[#dfff45] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#173020] transition hover:bg-white sm:block">Book a trial</Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-10 w-10 place-items-center rounded-full border border-white/25 lg:hidden" aria-label="Toggle menu"><Icon name={menuOpen ? "close" : "menu"} /></button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 bg-[#132b1d] px-5 py-6 lg:hidden">
            {[["Courts", "/courts"], ["Shop", "/shop"], ["Bar & Café", "/bar"], ["Book a trial", "/trial"], ["Membership", "/#membership"]].map(([item, href]) => <Link key={item} href={href} onClick={() => setMenuOpen(false)} className="block w-full border-b border-white/10 py-4 text-left font-display text-xl font-bold uppercase">{item}</Link>)}
            <Link href="/trial" onClick={() => setMenuOpen(false)} className="mt-6 block w-full rounded-full bg-[#dfff45] py-4 text-center text-xs font-bold uppercase tracking-wider text-[#173020]">Book a trial</Link>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="mt-3 block w-full rounded-full bg-white py-4 text-center text-xs font-bold uppercase tracking-wider text-[#173020]">Sign in</Link>
          </div>
        )}
      </header>

      <main>
        <section id="home" className="relative flex min-h-[760px] items-end overflow-hidden bg-[#10251a] text-white lg:min-h-screen">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero.jpg" alt="Padel player on court at Champions Club" className="absolute inset-0 h-full w-full object-cover object-[62%_center]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,28,17,.94)_0%,rgba(9,30,18,.74)_35%,rgba(9,29,18,.1)_70%),linear-gradient(0deg,rgba(7,23,14,.72)_0%,transparent_45%)]" />
          <div className="relative mx-auto w-full max-w-[1440px] px-5 pb-16 pt-36 sm:px-8 lg:px-12 lg:pb-20">
            <div className="max-w-[720px]">
              <div className="mb-7 flex items-center gap-3"><span className="h-px w-10 bg-[#dfff45]" /><span className="text-[10px] font-bold uppercase tracking-[.28em] text-[#dfff45]">Courts · Kitchen · Community</span></div>
              <h1 className="font-display text-[64px] font-bold uppercase leading-[.84] tracking-[-.035em] sm:text-[86px] lg:text-[118px]">Play hard.<br /><span className="text-[#dfff45]">Stay longer.</span></h1>
              <p className="mt-8 max-w-lg text-sm leading-7 text-white/70 sm:text-base">More than a place to play. Champions is your home court, your local, and your community—all under one roof.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/trial" className="group flex items-center gap-5 rounded-full bg-[#dfff45] px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#163021] transition hover:bg-white">Book a trial <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
                <Link href="/courts" className="rounded-full border border-white/35 px-6 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-[#163021]">Courts</Link>
                <Link href="/#membership" className="rounded-full border border-white/35 px-6 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-[#163021]">Membership</Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Club staff:</span>
                <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#163021] shadow-md transition hover:bg-[#dfff45]">
                  Sign in <Icon name="arrow" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            <div className="mt-16 flex flex-wrap gap-x-12 gap-y-5 border-t border-white/20 pt-6 text-[10px] uppercase tracking-[.18em] text-white/55 lg:absolute lg:bottom-20 lg:right-12 lg:mt-0 lg:w-[430px]">
              <span className="flex items-center gap-2"><Icon name="pin" className="h-4 w-4 text-[#dfff45]" />Jalandhar, Punjab</span>
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
          <div className="mx-auto max-w-[1100px] px-5 text-center sm:px-8">
            <p className="eyebrow">Memberships now open</p>
            <h2 className="mx-auto mt-5 max-w-4xl font-display text-6xl font-bold uppercase leading-[.88] tracking-tight sm:text-8xl">Make Champions<br /><span className="text-[#7c887e]">your home court.</span></h2>
            <p className="mx-auto mt-7 max-w-xl text-sm leading-7 text-[#68746b]">Priority booking, member rates, club events, and a community that always has room for one more.</p>
            <div className="mx-auto mt-10 flex max-w-md rounded-full border border-[#173021]/15 bg-white p-1.5 shadow-sm">
              <input aria-label="Email address" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1 bg-transparent px-5 text-sm outline-none placeholder:text-[#849087]" />
              <button onClick={async () => {
                const em = email.trim();
                if (!em.includes("@")) { setNotice("Add an email address first"); return; }
                try {
                  const res = await fetch("/api/v1/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Website visitor", contact: em, interest: "Membership", message: "Membership info requested from the website" }) });
                  if (!res.ok) throw new Error();
                  setEmail("");
                  setNotice("Thanks — we'll be in touch shortly");
                } catch { setNotice("Could not send that — try again"); }
              }} className="rounded-full bg-[#173021] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#294d36]">Request info</button>
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
            <button onClick={() => setNotice("Events calendar coming soon")}>Events</button>
            <button onClick={() => setNotice("Contact details: frontdesk@champions.club")}>Contact</button>
            <Icon name="instagram" className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="mx-auto mt-7 flex max-w-[1280px] flex-col justify-between gap-3 text-[9px] uppercase tracking-[.15em] text-white/30 sm:flex-row"><span>© 2025 Champions Club</span><span>Play · Eat · Belong</span></div>
      </footer>

      {notice && <div className="make-toast fixed bottom-5 right-5 z-50 rounded-full bg-white px-5 py-3 text-xs font-bold text-[#173021] shadow-2xl">{notice}</div>}
    </div>
  );
}
