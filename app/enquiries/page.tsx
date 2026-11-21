"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import type { EnquiryDTO } from "@/lib/types";

const statuses: EnquiryDTO["status"][] = ["NEW", "CONTACTED", "QUOTED", "CONVERTED", "LOST"];

export default function Enquiries() {
  const enquiries = useApi(() => api.enquiries());
  const plans = useApi(() => api.plans());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [planFor, setPlanFor] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const list = enquiries.data ?? [];

  async function patch(id: number, patch: { status?: EnquiryDTO["status"]; note?: string }) {
    setBusyId(id);
    setMsg(null);
    try {
      await api.updateEnquiry(id, patch);
      void enquiries.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Saving failed. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  async function convert(e: EnquiryDTO) {
    const planCode = planFor[e.id] ?? plans.data?.[0]?.code;
    if (!planCode) return;
    setBusyId(e.id);
    setMsg(null);
    try {
      await api.convertEnquiry(e.id, planCode);
      setMsg({ ok: true, text: `${e.name} is now a member. Their plan starts today.` });
      void enquiries.reload();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiClientError ? err.message : "Conversion failed. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Front desk</p>
        <h1 className="page-title">Enquiries</h1>
        <p className="sub">Every question the club gets, in one list: website, trials and walk-ins. Work them, note the follow-up, convert the good ones.</p>
      </div>

      {enquiries.loading ? (
        <Loading />
      ) : enquiries.error ? (
        <ErrorBox message={enquiries.error} onRetry={enquiries.reload} />
      ) : list.length === 0 ? (
        <Empty>No enquiries yet. Website questions and trial bookings land here.</Empty>
      ) : (
        <>
          {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}
          <div className="rows">
            {list.map((e) => (
              <div className="row-item" key={e.id} style={{ alignItems: "start" }}>
                <div className="row-main">
                  <p className="row-name">
                    {e.name} <span className="muted" style={{ fontWeight: 400 }}>{e.interest}</span>
                  </p>
                  <p className="muted">
                    {e.contact} · {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                  {e.message && <p style={{ marginTop: 4 }}>{e.message}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <input
                      aria-label={`Follow-up note for ${e.name}`}
                      placeholder="Follow-up note"
                      value={notes[e.id] ?? e.note}
                      onChange={(ev) => setNotes((n) => ({ ...n, [e.id]: ev.target.value }))}
                      style={{ minWidth: 220 }}
                    />
                    <button className="btn btn-quiet" disabled={busyId === e.id} onClick={() => patch(e.id, { note: notes[e.id] ?? e.note })}>
                      Save note
                    </button>
                    {e.status !== "CONVERTED" && (
                      <>
                        <select
                          style={{ width: "auto", minWidth: 120 }}
                          aria-label={`Plan for ${e.name}`}
                          value={planFor[e.id] ?? plans.data?.[0]?.code ?? ""}
                          onChange={(ev) => setPlanFor((p) => ({ ...p, [e.id]: ev.target.value }))}
                        >
                          {(plans.data ?? []).map((p) => (
                            <option key={p.code} value={p.code}>{p.name}</option>
                          ))}
                        </select>
                        <button className="btn btn-ink" disabled={busyId === e.id} onClick={() => convert(e)}>
                          Make member
                        </button>
                      </>
                    )}
                    {e.status === "CONVERTED" && <span className="muted" style={{ alignSelf: "center" }}>Member ✓</span>}
                  </div>
                </div>
                <select
                  style={{ width: "auto", minWidth: 140, flexShrink: 0 }}
                  aria-label={`Status for ${e.name}`}
                  value={e.status}
                  disabled={busyId === e.id}
                  onChange={(ev) => patch(e.id, { status: ev.target.value as EnquiryDTO["status"] })}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
