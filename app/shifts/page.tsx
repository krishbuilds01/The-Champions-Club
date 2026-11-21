"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import { addDaysISO, todayISO } from "@/lib/format";

const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T00:00:00.000Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return addDaysISO(iso, -dow);
};
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default function Shifts() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayISO()));
  const roster = useApi(() => api.staffRoster(), []);
  const shifts = useApi(() => api.shifts(weekStart, addDaysISO(weekStart, 6)), [weekStart]);
  const [form, setForm] = useState<{ staffId: number; date: string; part: "MORNING" | "EVENING" }>({ staffId: 0, date: todayISO(), part: "MORNING" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const list = shifts.data ?? [];
  const staffId = form.staffId || roster.data?.[0]?.id || 0;

  async function add() {
    if (!staffId) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.assignShift({ staffId, date: form.date, part: form.part });
      setMsg({ ok: true, text: "Shift added." });
      void shifts.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Saving failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      await api.removeShift(id);
      void shifts.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Removing failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const cell = (date: string, part: "MORNING" | "EVENING") => {
    const rows = list.filter((s) => s.date === date && s.part === part);
    if (rows.length === 0) return <span className="muted">—</span>;
    return rows.map((s) => (
      <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginRight: 10 }}>
        {s.staffName}
        <button aria-label={`Remove ${s.staffName} from ${part.toLowerCase()} ${date}`} disabled={busy} onClick={() => remove(s.id)} style={{ fontWeight: 700, lineHeight: 1 }}>×</button>
      </span>
    ));
  };

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Front desk</p>
        <h1 className="page-title">Staff rota</h1>
        <p className="sub">Who works which half of the day, week by week. Morning and evening — that is the whole system.</p>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <button className="btn btn-quiet" onClick={() => setWeekStart(addDaysISO(weekStart, -7))}>Previous week</button>
        <button className="btn btn-quiet" onClick={() => setWeekStart(mondayOf(todayISO()))}>This week</button>
        <button className="btn btn-quiet" onClick={() => setWeekStart(addDaysISO(weekStart, 7))}>Next week</button>
        <span className="muted">{dayLabel(weekStart)} — {dayLabel(addDaysISO(weekStart, 6))}</span>
      </div>

      {shifts.loading || roster.loading ? (
        <Loading />
      ) : shifts.error ? (
        <ErrorBox message={shifts.error} onRetry={shifts.reload} />
      ) : (
        <>
          <div className="ledger-wrap">
            <table className="ledger">
              <thead><tr><th>Day</th><th>Morning</th><th>Evening</th></tr></thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d} className={d === todayISO() ? "" : ""}>
                    <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{dayLabel(d)}{d === todayISO() ? " · today" : ""}</td>
                    <td>{cell(d, "MORNING")}</td>
                    <td>{cell(d, "EVENING")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="block">
            <div className="sec-head"><h2>Assign a shift</h2></div>
            <div className="panel panel-main" style={{ maxWidth: 760 }}>
              <div className="field-row" style={{ alignItems: "end" }}>
                <div>
                  <label htmlFor="sh-staff">Staff member</label>
                  <select id="sh-staff" value={staffId} onChange={(e) => setForm({ ...form, staffId: Number(e.target.value) })}>
                    {(roster.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="sh-date">Date</label>
                  <input id="sh-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label>Part of day</label>
                  <div className="seg" role="group" aria-label="Part of day">
                    <button aria-pressed={form.part === "MORNING"} onClick={() => setForm({ ...form, part: "MORNING" })}>Morning</button>
                    <button aria-pressed={form.part === "EVENING"} onClick={() => setForm({ ...form, part: "EVENING" })}>Evening</button>
                  </div>
                </div>
              </div>
              {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status" style={{ marginTop: 14 }}>{msg.text}</div>}
              <button className="btn btn-ink" style={{ marginTop: 16 }} disabled={busy || !staffId} onClick={add}>Add to rota</button>
            </div>
          </section>

          {(roster.data ?? []).length === 0 && <Empty>No staff on record yet.</Empty>}
        </>
      )}
    </main>
  );
}
