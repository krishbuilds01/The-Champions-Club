"use client";
import { useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { inr } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";
import type { ProductDTO } from "@/lib/types";

export default function InventoryPage() {
  const products = useApi(() => api.products());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"ALL" | "GEAR" | "BAR" | "LOW">("ALL");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Add product form
  const [form, setForm] = useState({
    name: "",
    category: "GEAR" as "GEAR" | "BAR",
    price: "",
    stock: "10",
    lowAt: "5",
  });
  const [creating, setCreating] = useState(false);

  const list = products.data ?? [];
  const gearList = list.filter((p) => p.category === "GEAR");
  const lowCount = gearList.filter((p) => p.stock !== null && p.stock <= p.lowAt && p.stock > 0).length;
  const outCount = gearList.filter((p) => p.stock === 0).length;
  const totalUnits = gearList.reduce((s, p) => s + (p.stock ?? 0), 0);

  const filtered = list.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cat === "GEAR") return p.category === "GEAR";
    if (cat === "BAR") return p.category === "BAR";
    if (cat === "LOW") return p.stock !== null && p.stock <= p.lowAt;
    return true;
  });

  async function adjust(id: number, delta: number) {
    setBusyId(id);
    setMsg(null);
    try {
      await api.adjustStock({ productId: id, delta });
      await products.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Adjustment failed." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setMsg({ ok: false, text: "Product name is required." });
    const priceNum = Number(form.price);
    if (!priceNum || priceNum <= 0) return setMsg({ ok: false, text: "Enter a valid price in rupees." });

    setCreating(true);
    setMsg(null);
    try {
      await api.createProduct({
        name: form.name.trim(),
        category: form.category,
        price: Math.round(priceNum),
        stock: form.category === "GEAR" ? Number(form.stock) || 0 : undefined,
        lowAt: Number(form.lowAt) || 5,
      });
      setForm({ name: "", category: "GEAR", price: "", stock: "10", lowAt: "5" });
      setMsg({ ok: true, text: "Product added to the club inventory." });
      await products.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Failed to add product." });
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <h1 className="page-title">Inventory &amp; Stock</h1>
        <p className="sub">Shared live inventory for the counter and online shop. Stock updates instantly upon order or arrival.</p>
      </div>

      {products.loading ? (
        <Loading />
      ) : products.error ? (
        <ErrorBox message={products.error} onRetry={products.reload} />
      ) : (
        <>
          <div className="figures" style={{ marginBottom: 24 }}>
            <div className="figure">
              <p className="f-label">Product lines</p>
              <p className="f-value num">{list.length}</p>
            </div>
            <div className="figure">
              <p className="f-label">Gear units on shelf</p>
              <p className="f-value num">{totalUnits}</p>
            </div>
            <div className={`figure${lowCount > 0 ? " total" : ""}`}>
              <p className="f-label">Low stock items</p>
              <p className="f-value num">{lowCount}</p>
            </div>
            <div className={`figure${outCount > 0 ? " total" : ""}`}>
              <p className="f-label">Out of stock</p>
              <p className="f-value num">{outCount}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 240, maxWidth: 360 }}>
              <input
                id="inv-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search inventory items..."
                aria-label="Search items"
              />
            </div>
            <div className="seg" role="group" aria-label="Filter category">
              <button aria-pressed={cat === "ALL"} onClick={() => setCat("ALL")}>All ({list.length})</button>
              <button aria-pressed={cat === "GEAR"} onClick={() => setCat("GEAR")}>Gear ({gearList.length})</button>
              <button aria-pressed={cat === "BAR"} onClick={() => setCat("BAR")}>Bar ({list.length - gearList.length})</button>
              <button aria-pressed={cat === "LOW"} onClick={() => setCat("LOW")}>Low stock ({lowCount + outCount})</button>
            </div>
          </div>

          {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}

          {filtered.length === 0 ? (
            <Empty>No items match that filter.</Empty>
          ) : (
            <div className="ledger-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th className="r">Price</th>
                    <th>Stock on hand</th>
                    <th className="hide-m">Low threshold</th>
                    <th className="r">Adjust stock</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const isGear = p.category === "GEAR";
                    const isOut = isGear && p.stock === 0;
                    const isLow = isGear && p.stock !== null && p.stock <= p.lowAt && !isOut;
                    const isBusy = busyId === p.id;

                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td><span className="muted">{isGear ? "Gear" : "Bar & Café"}</span></td>
                        <td className="r num">{inr(p.price)}</td>
                        <td>
                          {isGear ? (
                            <span className={`status ${isOut ? "expired" : isLow ? "expiring" : "active"}`}>
                              <strong className="num">{p.stock}</strong> {isOut ? "Out of stock" : isLow ? "Low stock" : "In stock"}
                            </span>
                          ) : (
                            <span className="muted">Made-to-order</span>
                          )}
                        </td>
                        <td className="num hide-m">{isGear ? `${p.lowAt} units` : "—"}</td>
                        <td className="r">
                          {isGear ? (
                            <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                              <button
                                className="btn btn-quiet"
                                style={{ minHeight: 32, padding: "4px 10px", fontSize: 13 }}
                                disabled={isBusy || p.stock === 0}
                                onClick={() => adjust(p.id, -1)}
                                title="Deduct 1"
                              >
                                −1
                              </button>
                              <button
                                className="btn btn-quiet"
                                style={{ minHeight: 32, padding: "4px 10px", fontSize: 13 }}
                                disabled={isBusy}
                                onClick={() => adjust(p.id, 1)}
                                title="Add 1"
                              >
                                +1
                              </button>
                              <button
                                className="btn btn-ink"
                                style={{ minHeight: 32, padding: "4px 10px", fontSize: 13 }}
                                disabled={isBusy}
                                onClick={() => adjust(p.id, 5)}
                                title="Restock 5 units"
                              >
                                +5 restock
                              </button>
                            </div>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <section className="block">
            <div className="sec-head">
              <h2>Add new product line</h2>
            </div>
            <form className="panel" style={{ maxWidth: 720 }} onSubmit={handleCreate}>
              <div className="field-row">
                <div>
                  <label htmlFor="p-name">Product name</label>
                  <input
                    id="p-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Badminton Racket or Recovery Shake"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="p-cat">Department</label>
                  <select
                    id="p-cat"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as "GEAR" | "BAR" })}
                  >
                    <option value="GEAR">Sports Gear &amp; Apparel (Tracked Stock)</option>
                    <option value="BAR">Bar &amp; Café Menu (Made to order)</option>
                  </select>
                </div>
              </div>

              <div className="field-row" style={{ marginTop: 16 }}>
                <div>
                  <label htmlFor="p-price">Price (₹ INR)</label>
                  <input
                    id="p-price"
                    type="number"
                    min="1"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="e.g. 1499"
                    required
                  />
                </div>
                {form.category === "GEAR" ? (
                  <>
                    <div>
                      <label htmlFor="p-stock">Opening stock</label>
                      <input
                        id="p-stock"
                        type="number"
                        min="0"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="p-low">Low stock warning at</label>
                      <input
                        id="p-low"
                        type="number"
                        min="1"
                        value={form.lowAt}
                        onChange={(e) => setForm({ ...form, lowAt: e.target.value })}
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <div style={{ marginTop: 20 }}>
                <button className="btn btn-ink" type="submit" disabled={creating}>
                  {creating ? "Adding product..." : "Add to inventory"}
                </button>
              </div>
            </form>
          </section>

          <p style={{ marginTop: 24, display: "flex", gap: 20 }}>
            <Link className="text-link" href="/shop">View customer shop &rarr;</Link>
            <Link className="text-link" href="/dashboard">Back to dashboard</Link>
          </p>
        </>
      )}
    </main>
  );
}
