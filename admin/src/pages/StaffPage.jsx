import { useEffect, useState } from "react";
import api from "../api/axios";

const ROLE_LABELS = {
  superadmin: "Super Admin",
  admin: "Admin (full access)",
  product_manager: "Product Manager",
  order_manager: "Order Manager",
  inventory_manager: "Inventory Manager",
  payment_manager: "Payment Manager",
  delivery_manager: "Delivery Manager",
  support_agent: "Support Agent",
  marketing_manager: "Marketing Manager",
};

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "support_agent" });
  const [editing, setEditing] = useState(null); // staff being reset-password
  const [newPass, setNewPass] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.get("/admin/staff"), api.get("/admin/auth/me").catch(() => null)])
      .then(([s, meRes]) => {
        setStaff(s.data.staff || []);
        setRoles(s.data.roles || []);
        setMe(meRes?.data?.admin || null);
      })
      .catch(() => setError("Failed to load staff."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const isSuper = me?.role === "superadmin";

  async function addStaff(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await api.post("/admin/staff", form);
      setSuccess(r.data.message);
      setForm({ name: "", email: "", phone: "", password: "", role: "support_agent" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add staff.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(s, role) {
    setError("");
    try {
      await api.patch(`/admin/staff/${s.id}`, { role });
      setSuccess(`${s.name} is now ${ROLE_LABELS[role] || role}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change role.");
    }
  }

  async function toggleActive(s) {
    setError("");
    try {
      await api.patch(`/admin/staff/${s.id}`, { active: !s.active });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update staff.");
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api.post(`/admin/staff/${editing.id}/reset-password`, { password: newPass });
      setSuccess(r.data.message);
      setEditing(null);
      setNewPass("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setBusy(false);
    }
  }

  const assignableRoles = roles.filter((r) => r !== "superadmin");

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-desc">Manage staff accounts and their access roles</p>
        </div>
        {isSuper && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Staff</button>}
      </div>

      {error && <div className="alert-error">{error} <button onClick={() => setError("")}>×</button></div>}
      {success && <div className="alert-success">{success} <button onClick={() => setSuccess("")}>×</button></div>}

      {!isSuper && (
        <div className="alert-error">Only the Super Admin (owner) can manage staff accounts.</div>
      )}

      {loading ? (
        <div className="page-loading"><span className="spinner" /></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Last login</th>
                {isSuper && <th className="th-actions">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="td-strong">
                    {s.name}
                    {s.role === "superadmin" && <span className="badge" style={{ marginLeft: 6 }}>owner</span>}
                  </td>
                  <td>{s.email}</td>
                  <td>{s.phone || "—"}</td>
                  <td>
                    {isSuper && s.role !== "superadmin" ? (
                      <select
                        value={s.role}
                        onChange={(e) => changeRole(s, e.target.value)}
                        style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontFamily: "inherit" }}
                      >
                        {assignableRoles.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                        ))}
                      </select>
                    ) : (
                      ROLE_LABELS[s.role] || s.role
                    )}
                  </td>
                  <td>
                    <span className={`status-pill small ${s.active ? "approved" : "rejected"}`}>
                      {s.active ? "active" : "deactivated"}
                    </span>
                  </td>
                  <td className="td-muted">{s.lastLogin ? new Date(s.lastLogin).toLocaleDateString() : "never"}</td>
                  {isSuper && (
                    <td className="td-actions">
                      {s.role !== "superadmin" && (
                        <>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(s); setNewPass(""); }}>Reset password</button>
                          <button className="btn btn-sm btn-danger" onClick={() => toggleActive(s)}>
                            {s.active ? "Deactivate" : "Activate"}
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add staff modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Add Staff</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={addStaff}>
              <div className="modal-body">
                <div className="form-field"><label>Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
                <div className="form-field"><label>Email *</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="form-field"><label>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="form-field"><label>Temporary password * (min 6 chars)</label>
                  <input required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                <div className="form-field"><label>Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>Create account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Reset password — {editing.name}</h2>
              <button className="modal-close" onClick={() => setEditing(null)}>×</button>
            </div>
            <form onSubmit={resetPassword}>
              <div className="modal-body">
                <div className="form-field"><label>New password * (min 6 chars)</label>
                  <input required minLength={6} value={newPass} onChange={(e) => setNewPass(e.target.value)} autoFocus /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
