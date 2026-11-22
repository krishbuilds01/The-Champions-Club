// Shared formatting for web and API responses. Times travel as minutes
// from midnight (an integer), dates as YYYY-MM-DD strings.
export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export const fmtTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60 === 30 ? "30" : "00";
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m} ${ap}`;
};

// The club is in India, so "today" and day boundaries are IST whatever
// timezone the server happens to run in. India has no daylight saving.
const IST_MS = 5.5 * 60 * 60 * 1000;

export const todayISO = () => new Date(Date.now() + IST_MS).toISOString().slice(0, 10);

export const istMinutesNow = () => {
  const d = new Date(Date.now() + IST_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

// The UTC instant an IST calendar day starts (for timestamp columns).
export const istDayStart = (dateISO: string) => new Date(`${dateISO}T00:00:00+05:30`);

export const addDaysISO = (dateISO: string, days: number) =>
  new Date(Date.parse(dateISO) + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const isISODate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  // Date.parse rolls impossible dates forward (2026-02-30 becomes
  // 2026-03-02), so build the date and check the parts round-trip.
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

// Court hours: first start 6:00 AM, last start 9:00 PM, one hour a booking.
export const OPEN_MIN = 360;
export const LAST_START_MIN = 1260;
export const SLOT_STEP = 30;
export const BOOKING_LEN = 60;

export const allStarts = () => {
  const out: number[] = [];
  for (let t = OPEN_MIN; t <= LAST_START_MIN; t += SLOT_STEP) out.push(t);
  return out;
};
