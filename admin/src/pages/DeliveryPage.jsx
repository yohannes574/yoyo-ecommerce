import { useEffect, useState } from "react";
import api from "../api/axios";

const EMPTY_ZONE = { city: "", subCity: "", zone: "", standardFee: 100, expressFee: 250, etaDays: "2–3", active: true };
const EMPTY_STAFF = { name: "", phone: "", zone: "" };

export default function DeliveryPage() {
  const [tab, setTab] = useState("zones"); // zones | settings | staff | assignments
  const [zones, setZones] = useState([]);
  const [staff, setStaff] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [settings, setSettings] = useState({ defaultFee: 100, defaultExpressFee: 250, freeDeliveryThreshold: 0 });
  const [loading, setLoading] = useState(true);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editZone, setEditZone] = useState(null);
  const [zoneForm, setZoneForm] = useState(EMPTY_ZONE);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [assigning, setAssigning] = useState(null); // order being assigned
  const [assignStaffId, setAssignStaffId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.get("/admin/delivery/zones").catch(() => ({ data: { zones: [] } })),
      api.get("/admin/delivery/settings").catch(() => ({ data: { settings } })),
      api.get("/admin/delivery/staff").catch(() => ({ data: { staff: [] } })),
      api.get("/admin/delivery/assignments").catch(() => ({ data: { orders: [] } })),
    ])
      .then(([z, s, st, a]) => {
        setZones(z.data.zones || []);
        setSettings(s.data.settings || settings);
        setStaff(st.data.staff || []);
        setAssignments(a.data.orders || []);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(msg) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 2500);
  }

  /* Zones */
  function openZone(zone = null) {
    setEditZone(zone);
    setZoneForm(zone ? { ...zone } : EMPTY_ZONE);
    setError("");
    setShowZoneModal(true);
  }

  async function saveZone() {
    if (!zoneForm.city.trim() || !zoneForm.subCity.trim()) {
      setError("City and sub-city are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (editZone) {
        await api.put(`/admin/delivery/zones/${editZone.id}`, zoneForm);
        flash("Zone updated.");
      } else {
        await api.post("/admin/delivery/zones", zoneForm);
        flash("Zone created.");
      }
      setShowZoneModal(false);
      const r = await api.get("/admin/delivery/zones");
      setZones(r.data.zones || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save zone.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteZone(z) {
    if (!window.confirm(`Delete zone ${z.city} / ${z.subCity}?`)) return;
    try {
      await api.delete(`/admin/delivery/zones/${z.id}`);
      setZones((prev) => prev.filter((x) => x.id !== z.id));
      flash("Zone deleted.");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to delete zone.");
    }
  }

  /* Settings */
  async function saveSettings() {
    setBusy(true);
    setError("");
    try {
      const r = await api.put("/admin/delivery/settings", settings);
      setSettings(r.data.settings);
      flash("Delivery settings saved.");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save settings.");
    } finally {
      setBusy(false);
    }
  }

  /* Staff */
  async function saveStaff(e) {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.phone.trim()) {
      setError("Name and phone are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/admin/delivery/staff", staffForm);
      setStaffForm(EMPTY_STAFF);
      setShowStaffForm(false);
      const r = await api.get("/admin/delivery/staff");
      setStaff(r.data.staff || []);
      flash("Delivery staff added.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add staff.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStaff(s) {
    try {
      await api.put(`/admin/delivery/staff/${s.id}`, { active: !s.active });
      setStaff((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !s.active } : x)));
    } catch { /* ignore */ }
  }

  async function deleteStaff(s) {
    if (!window.confirm(`Remove ${s.name} from delivery staff?`)) return;
    try {
      await api.delete(`/admin/delivery/staff/${s.id}`);
      setStaff((prev) => prev.filter((x) => x.id !== s.id));
      flash("Staff removed.");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to remove staff.");
    }
  }

  /* Assignment */
  async function assign() {
    if (!assignStaffId) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.post("/admin/delivery/assign", { orderId: assigning.id, staffId: assignStaffId });
      flash(r.data.message || "Assigned.");
      setAssigning(null);
      setAssignStaffId("");
      const a = await api.get("/admin/delivery/assignments");
      setAssignments(a.data.orders || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to assign.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Delivery</h1>
          <p className="page-desc">Delivery zones & fees, staff, and order assignments</p>
        </div>
        {tab === "zones" && (
          <button className="btn btn-primary" onClick={() => openZone(null)}>+ Add Zone</button>
        )}
        {tab === "staff" && (
          <button className="btn btn-primary" onClick={() => setShowStaffForm(true)}>+ Add Staff</button>
        )}
      </div>

      {error && <div className="alert-error">{error} <button onClick={() => setError("")}>×</button></div>}
      {success && <div className="alert-success">{success} <button onClick={() => setSuccess("")}>×</button></div>}

      <div className="tabs-row">
        {[
          ["zones", "Zones & Fees"],
          ["settings", "Default Settings"],
          ["staff", "Delivery Staff"],
          ["assignments", "Assignments"],
        ].map(([k, label]) => (
          <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading"><span className="spinner" /></div>
      ) : (
        <>
          {tab === "zones" && (
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>City</th><th>Sub-city</th><th>Standard Fee</th><th>Express Fee</th><th>ETA (days)</th><th>Status</th><th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z.id}>
                      <td className="td-strong">{z.city}</td>
                      <td>{z.subCity}</td>
                      <td>{z.standardFee?.toLocaleString()} ETB</td>
                      <td>{z.expressFee != null ? `${z.expressFee.toLocaleString()} ETB` : "—"}</td>
                      <td>{z.etaDays || "—"}</td>
                      <td>
                        <span className={`status-pill small ${z.active ? "approved" : "rejected"}`}>{z.active ? "active" : "disabled"}</span>
                      </td>
                      <td className="td-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => openZone(z)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteZone(z)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {zones.length === 0 && (
                    <tr><td colSpan={7} className="empty-row">No zones yet — customers will be charged the default fee.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === "settings" && (
            <div className="detail-card settings-cards">
              <div className="form-grid-3">
                <div className="form-field">
                  <label>Default standard fee (ETB)</label>
                  <input type="number" min="0" value={settings.defaultFee}
                    onChange={(e) => setSettings({ ...settings, defaultFee: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Default express fee (ETB)</label>
                  <input type="number" min="0" value={settings.defaultExpressFee}
                    onChange={(e) => setSettings({ ...settings, defaultExpressFee: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Free delivery threshold (0 = off)</label>
                  <input type="number" min="0" value={settings.freeDeliveryThreshold}
                    onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: e.target.value })} />
                </div>
              </div>
              <p className="muted" style={{ fontSize: 13 }}>
                Zones override the default fee for matching city + sub-city addresses. Free delivery applies to
                standard delivery when the order subtotal reaches the threshold.
              </p>
              <div><button className="btn btn-primary" onClick={saveSettings} disabled={busy}>Save Settings</button></div>
            </div>
          )}

          {tab === "staff" && (
            <>
              {showStaffForm && (
                <form className="detail-card" onSubmit={saveStaff} style={{ maxWidth: 520 }}>
                  <div className="form-field"><label>Name *</label>
                    <input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} placeholder="Full name" autoFocus /></div>
                  <div className="form-field"><label>Phone *</label>
                    <input value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} placeholder="+251…" /></div>
                  <div className="form-field"><label>Primary zone</label>
                    <input value={staffForm.zone} onChange={(e) => setStaffForm({ ...staffForm, zone: e.target.value })} placeholder="e.g. Bole" /></div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowStaffForm(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>Add</button>
                  </div>
                </form>
              )}
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Phone</th><th>Zone</th><th>Active orders</th><th>Status</th><th className="th-actions">Actions</th></tr>
                  </thead>
                  <tbody>
                    {staff.map((s) => (
                      <tr key={s.id}>
                        <td className="td-strong">{s.name}</td>
                        <td>{s.phone}</td>
                        <td>{s.zone || "—"}</td>
                        <td>{s.currentOrders}</td>
                        <td>
                          <span className={`status-pill small ${s.active ? "approved" : "rejected"}`}>{s.active ? "active" : "inactive"}</span>
                        </td>
                        <td className="td-actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => toggleStaff(s)}>{s.active ? "Deactivate" : "Activate"}</button>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteStaff(s)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                    {staff.length === 0 && <tr><td colSpan={6} className="empty-row">No delivery staff yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "assignments" && (
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr><th>Order</th><th>Customer</th><th>Phone</th><th>Address</th><th>Status</th><th>Assigned staff</th><th className="th-actions">Actions</th></tr>
                </thead>
                <tbody>
                  {assignments.map((o) => (
                    <tr key={o.id}>
                      <td className="td-strong">{o.orderNumber}</td>
                      <td>{o.customerName}</td>
                      <td>{o.phone}</td>
                      <td className="td-comment"><span className="clamp-2">{[o.address, o.subCity, o.city].filter(Boolean).join(", ")}</span></td>
                      <td><span className="status-pill small pending">{o.status.replace(/_/g, " ")}</span></td>
                      <td>{o.staff ? `${o.staff.name} (${o.staff.phone})` : <span className="muted">Unassigned</span>}</td>
                      <td className="td-actions">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setAssigning(o);
                            setAssignStaffId(o.staff?.id || "");
                          }}
                        >
                          {o.staff ? "Reassign" : "Assign"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr><td colSpan={7} className="empty-row">No orders currently ready for delivery.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Zone modal */}
      {showZoneModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowZoneModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editZone ? "Edit Zone" : "Add Delivery Zone"}</h2>
              <button className="modal-close" onClick={() => setShowZoneModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-field"><label>City *</label>
                  <input value={zoneForm.city} onChange={(e) => setZoneForm({ ...zoneForm, city: e.target.value })} placeholder="Addis Ababa" autoFocus /></div>
                <div className="form-field"><label>Sub-city *</label>
                  <input value={zoneForm.subCity} onChange={(e) => setZoneForm({ ...zoneForm, subCity: e.target.value })} placeholder="Bole" /></div>
              </div>
              <div className="form-field"><label>Zone label (optional)</label>
                <input value={zoneForm.zone || ""} onChange={(e) => setZoneForm({ ...zoneForm, zone: e.target.value })} placeholder="Central Addis" /></div>
              <div className="form-grid-3">
                <div className="form-field"><label>Standard fee (ETB) *</label>
                  <input type="number" min="0" value={zoneForm.standardFee} onChange={(e) => setZoneForm({ ...zoneForm, standardFee: e.target.value })} /></div>
                <div className="form-field"><label>Express fee (ETB)</label>
                  <input type="number" min="0" value={zoneForm.expressFee ?? ""} onChange={(e) => setZoneForm({ ...zoneForm, expressFee: e.target.value })} /></div>
                <div className="form-field"><label>ETA (days)</label>
                  <input value={zoneForm.etaDays || ""} onChange={(e) => setZoneForm({ ...zoneForm, etaDays: e.target.value })} placeholder="2–3" /></div>
              </div>
              <label className="checkbox-label">
                <input type="checkbox" checked={zoneForm.active} onChange={(e) => setZoneForm({ ...zoneForm, active: e.target.checked })} />
                Zone active
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowZoneModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveZone} disabled={busy}>{editZone ? "Save Changes" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assigning && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAssigning(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Assign delivery — {assigning.orderNumber}</h2>
              <button className="modal-close" onClick={() => setAssigning(null)}>×</button>
            </div>
            <div className="modal-body">
              <p className="muted" style={{ fontSize: 13.5 }}>
                {assigning.customerName} • {assigning.phone} • {[assigning.address, assigning.subCity, assigning.city].filter(Boolean).join(", ")}
              </p>
              <div className="form-field">
                <label>Delivery staff</label>
                <select value={assignStaffId} onChange={(e) => setAssignStaffId(e.target.value)}>
                  <option value="">Select staff…</option>
                  {staff.filter((s) => s.active).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.phone} ({s.currentOrders} active)</option>
                  ))}
                </select>
              </div>
              <p className="muted" style={{ fontSize: 12.5 }}>
                Assigning an order that is "Ready for delivery" moves it to "Out for delivery" and notifies the customer.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAssigning(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={assign} disabled={busy || !assignStaffId}>Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
