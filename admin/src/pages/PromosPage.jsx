import { useEffect, useState } from "react";
import api from "../api/axios";

// Field names match the server schema exactly:
// { code, type: percent|fixed, value, minOrder, maxDiscount, usageLimit, startDate, endDate, active }
const EMPTY_FORM = {
  code: "", type: "percent", value: "",
  minOrder: "", maxDiscount: "", usageLimit: "",
  startDate: "", endDate: "", active: true,
};

function generateCode() {
  return "YOYO" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function PromosPage() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPromo, setEditPromo] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function loadPromos() {
    setLoading(true);
    api.get("/admin/promos")
      .then((r) => setPromos(r.data.promos || []))
      .catch(() => setPromos([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPromos(); }, []);

  function openCreate() {
    setEditPromo(null);
    setForm({ ...EMPTY_FORM, code: generateCode() });
    setError("");
    setShowModal(true);
  }

  function openEdit(promo) {
    setEditPromo(promo);
    setForm({
      code: promo.code || "",
      type: promo.type || "percent",
      value: String(promo.value ?? ""),
      minOrder: String(promo.minOrder ?? ""),
      maxDiscount: String(promo.maxDiscount ?? ""),
      usageLimit: String(promo.usageLimit ?? ""),
      startDate: promo.startDate ? String(promo.startDate).split("T")[0] : "",
      endDate: promo.endDate ? String(promo.endDate).split("T")[0] : "",
      active: promo.active !== false,
    });
    setError("");
    setShowModal(true);
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.code.trim() || !form.value) {
      setError("Code and Discount Value are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minOrder: Number(form.minOrder) || 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : 0,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        active: form.active,
      };
      if (editPromo) {
        await api.put(`/admin/promos/${editPromo.id || editPromo._id}`, payload);
        setSuccess("Promo code updated.");
      } else {
        await api.post("/admin/promos", payload);
        setSuccess("Promo code created.");
      }
      setShowModal(false);
      loadPromos();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save promo code.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(promo) {
    try {
      const r = await api.patch(`/admin/promos/${promo.id || promo._id}/toggle`);
      setPromos((prev) =>
        prev.map((p) => (p.id === (promo.id || promo._id) ? { ...p, active: r.data.active } : p))
      );
    } catch { /* ignore */ }
  }

  async function deletePromo(promo) {
    if (!window.confirm(`Delete promo code "${promo.code}"?`)) return;
    try {
      await api.delete(`/admin/promos/${promo.id || promo._id}`);
      setSuccess("Promo code deleted.");
      setPromos((prev) => prev.filter((p) => p.id !== (promo.id || promo._id)));
    } catch (e) {
      setError(e.response?.data?.message || "Failed to delete.");
    }
  }

  function isExpired(promo) {
    if (!promo.endDate) return false;
    return new Date(promo.endDate) < new Date();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Promotions</h1>
          <p className="page-desc">Manage promo codes and discounts</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Promo Code</button>
      </div>

      {error && <div className="alert-error">{error} <button onClick={() => setError("")}>×</button></div>}
      {success && <div className="alert-success">{success} <button onClick={() => setSuccess("")}>×</button></div>}

      <div className="table-card">
        {loading ? (
          <div className="table-loading"><span className="spinner" /> Loading promos…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Used / Limit</th>
                <th>Validity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => {
                const expired = isExpired(p);
                const pid = p.id || p._id;
                return (
                  <tr key={pid}>
                    <td>
                      <code className="promo-code">{p.code}</code>
                    </td>
                    <td className="capitalize">{p.type === "percent" ? "Percentage" : "Fixed"}</td>
                    <td>
                      <strong>
                        {p.type === "percent"
                          ? `${p.value}%`
                          : `${(p.value || 0).toLocaleString()} ETB`}
                      </strong>
                    </td>
                    <td>{p.minOrder ? `${p.minOrder.toLocaleString()} ETB` : "—"}</td>
                    <td>
                      {p.usedCount || 0}
                      {p.usageLimit ? ` / ${p.usageLimit}` : " / ∞"}
                    </td>
                    <td>
                      {p.startDate && <span>{new Date(p.startDate).toLocaleDateString("en-ET")} → </span>}
                      {p.endDate ? new Date(p.endDate).toLocaleDateString("en-ET") : "No expiry"}
                    </td>
                    <td>
                      {expired ? (
                        <span className="status-badge" style={{ "--badge-color": "#6b7280" }}>Expired</span>
                      ) : (
                        <span className="status-badge" style={{ "--badge-color": p.active ? "#10b981" : "#ef4444" }}>
                          {p.active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>Edit</button>
                        {!expired && (
                          <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(p)}>
                            {p.active ? "Disable" : "Enable"}
                          </button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => deletePromo(p)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && promos.length === 0 && (
                <tr><td colSpan={8} className="empty-row">No promo codes yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Promo Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editPromo ? "Edit Promo Code" : "Create Promo Code"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="alert-error">{error}</div>}
            <div className="modal-body">
              <div className="field-row">
                <div className="form-field">
                  <label>Code *</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setField("code", e.target.value.toUpperCase())}
                      placeholder="YOYO20"
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setField("code", generateCode())}
                    >
                      Random
                    </button>
                  </div>
                </div>
              </div>

              <div className="field-row">
                <div className="form-field">
                  <label>Discount Type</label>
                  <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (ETB)</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Discount Value *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.value}
                    onChange={(e) => setField("value", e.target.value)}
                    placeholder={form.type === "percent" ? "e.g. 20" : "e.g. 100"}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="form-field">
                  <label>Minimum Order (ETB)</label>
                  <input type="number" min="0" value={form.minOrder} onChange={(e) => setField("minOrder", e.target.value)} placeholder="0" />
                </div>
                {form.type === "percent" && (
                  <div className="form-field">
                    <label>Max Discount (ETB)</label>
                    <input type="number" min="0" value={form.maxDiscount} onChange={(e) => setField("maxDiscount", e.target.value)} placeholder="No limit" />
                  </div>
                )}
              </div>

              <div className="field-row">
                <div className="form-field">
                  <label>Usage Limit</label>
                  <input type="number" min="0" value={form.usageLimit} onChange={(e) => setField("usageLimit", e.target.value)} placeholder="Unlimited" />
                </div>
              </div>

              <div className="field-row">
                <div className="form-field">
                  <label>Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
                </div>
                <div className="form-field">
                  <label>End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} />
                </div>
              </div>

              <div className="form-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setField("active", e.target.checked)}
                  />
                  Active (immediately usable)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="btn-spinner" /> : editPromo ? "Save Changes" : "Create Code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
