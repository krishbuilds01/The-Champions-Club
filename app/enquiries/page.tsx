"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import type { EnquiryDTO } from "@/lib/types";
import { inr } from "@/lib/format";

const statuses: EnquiryDTO["status"][] = ["NEW", "CONTACTED", "QUOTED", "CONVERTED", "LOST"];

export default function Enquiries() {
  const enquiries = useApi(() => api.enquiries());
  const plans = useApi(() => api.plans());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [planFor, setPlanFor] = useState<Record<number, string>>({});
  const [quoteAmt, setQuoteAmt] = useState<Record<number, string>>({});
  const [quoteNotes, setQuoteNotes] = useState<Record<number, string>>({});
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

  async function quote(e: EnquiryDTO) {
    const planCode = planFor[e.id] ?? plans.data?.[0]?.code;
    const amount = Number(quoteAmt[e.id] ?? e.quoteAmount ?? "");
    if (!planCode) return;
    if (!Number.isInteger(amount) || amount <= 0) {
      setMsg({ ok: false, text: `Add the quote amount for ${e.name} first.` });
      return;
    }
    setBusyId(e.id);
    setMsg(null);
    try {
      const q = await api.quoteEnquiry(e.id, { planCode, amount, note: (quoteNotes[e.id] ?? e.quoteNote).trim() });
      setMsg({ ok: true, text: `Quote recorded as sent to ${e.name} — ${q.quotePlan} at ${inr(q.quoteAmount ?? amount)}.` });
      void enquiries.reload();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiClientError ? err.message : "Quote failed. Try again." });
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
          <p className="count-line" style={{ paddingBottom: 2 }}>
            <b>{list.filter((e) => e.status === "NEW").length}</b> new · {list.length} total
          </p>
          <div className="rows">
            {list.map((e) => (
              <div className={`row-item${e.status === "NEW" ? " row-new" : ""}${e.status === "LOST" ? " row-off" : ""}`} key={e.id} style={{ alignItems: "start" }}>
                <div className="row-main">
                  <p className="row-name">
                    {e.name} <span className="tag">{e.interest}</span>
                  </p>
                  <p className="muted">
                    {e.contact} · {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                  {e.message && <p style={{ marginTop: 4 }}>{e.message}</p>}
                  {e.quoteAmount !== null && (
                    <p style={{ marginTop: 6 }}>
                      <span className="tag">Quote sent</span>{" "}
                      <strong>{e.quotePlan} · {inr(e.quoteAmount)}</strong>
                      {e.quotedAt ? <span className="muted"> · {new Date(e.quotedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span> : null}
                      {e.quoteNote ? <span className="muted"> — {e.quoteNote}</span> : null}
                    </p>
                  )}
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
                  {e.status !== "CONVERTED" && e.status !== "LOST" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <input
                        aria-label={`Quote amount for ${e.name}`}
                        placeholder="Quote ₹ (uses the plan picked above)"
                        inputMode="numeric"
                        value={quoteAmt[e.id] ?? (e.quoteAmount !== null ? String(e.quoteAmount) : "")}
                        onChange={(ev) => setQuoteAmt((q) => ({ ...q, [e.id]: ev.target.value.replace(/\D/g, "") }))}
                        style={{ minWidth: 200 }}
                      />
                      <input
                        aria-label={`Quote note for ${e.name}`}
                        placeholder="Quote note — what it covers"
                        value={quoteNotes[e.id] ?? e.quoteNote}
                        onChange={(ev) => setQuoteNotes((q) => ({ ...q, [e.id]: ev.target.value }))}
                        style={{ minWidth: 200 }}
                      />
                      <button className="btn btn-quiet" disabled={busyId === e.id} onClick={() => quote(e)}>
                        {e.quoteAmount !== null ? "Update quote" : "Send quote"}
                      </button>
                    </div>
                  )}
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
