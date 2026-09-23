import { useEffect, useState } from "react";
import api from "../api/axios";

export default function SettingsPage() {
  const [company, setCompany] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api
      .get("/admin/settings")
      .then((r) => {
        setCompany(r.data.company);
        setPayment(r.data.payment);
      })
      .catch(() => setError("Failed to load settings (settings permission required)."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function flash(m) {
    setSuccess(m);
    setTimeout(() => setSuccess(""), 2500);
  }

  async function saveCompany() {
    setBusy(true);
    setError("");
    try {
      const r = await api.put("/admin/settings/company", company);
      setCompany(r.data.company);
      flash("Company info saved.");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  async function savePayment(next) {
    setBusy(true);
    setError("");
    try {
      const r = await api.put("/admin/settings/payment", next);
      setPayment({ methods: r.data.payment.methods, banks: r.data.payment.banks });
      flash("Payment settings saved.");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  function updateBank(id, key, val) {
    setPayment((p) => ({
      ...p,
      banks: p.banks.map((b) => (b.id === id ? { ...b, [key]: val } : b)),
    }));
  }

  if (loading) return <div className="page"><div className="page-loading"><span className="spinner" /></div></div>;

  const METHOD_LABELS = {
    cash_on_delivery: ["💵 Cash on Delivery", "Customers pay the courier in cash"],
    bank_transfer: ["🏦 Bank Transfer", "Customers upload a transfer receipt for verification"],
    mobile: ["📱 Mobile Money (Telebirr / CBE Birr / M-Pesa)", "Requires the payment gateway to be configured (Phase 7)"],
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-desc">Company information and payment configuration</p>
        </div>
      </div>

      {error && <div className="alert-error">{error} <button onClick={() => setError("")}>×</button></div>}
      {success && <div className="alert-success">{success} <button onClick={() => setSuccess("")}>×</button></div>}

      {/* Company */}
      {company && (
        <div className="detail-card settings-cards">
          <span className="card-title">Company Information</span>
          <div className="form-grid-2">
            <div className="form-field"><label>Company name</label>
              <input value={company.name || ""} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></div>
            <div className="form-field"><label>Phone</label>
              <input value={company.phone || ""} onChange={(e) => setCompany({ ...company, phone: e.target.value })} /></div>
          </div>
          <div className="form-grid-2">
            <div className="form-field"><label>Email</label>
              <input value={company.email || ""} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></div>
            <div className="form-field"><label>Address</label>
              <input value={company.address || ""} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></div>
          </div>
          <div className="form-grid-2">
            <div className="form-field"><label>Facebook URL</label>
              <input value={company.social?.facebook || ""} onChange={(e) => setCompany({ ...company, social: { ...company.social, facebook: e.target.value } })} /></div>
            <div className="form-field"><label>Instagram URL</label>
              <input value={company.social?.instagram || ""} onChange={(e) => setCompany({ ...company, social: { ...company.social, instagram: e.target.value } })} /></div>
          </div>
          <div>
            <button className="btn btn-primary" onClick={saveCompany} disabled={busy}>Save Company Info</button>
          </div>
        </div>
      )}

      {/* Payment methods */}
      {payment && (
        <>
          <div className="detail-card settings-cards">
            <span className="card-title">Payment Methods</span>
            {Object.entries(METHOD_LABELS).map(([key, [label, desc]]) => (
              <div key={key} className="inline-actions" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{desc}</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={!!payment.methods[key]}
                    onChange={(e) => savePayment({ ...payment, methods: { ...payment.methods, [key]: e.target.checked } })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
          </div>

          <div className="detail-card settings-cards">
            <span className="card-title">Bank Accounts (shown to customers at checkout)</span>
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr><th>Bank</th><th>Account Number</th><th>Account Holder</th><th>Branch</th><th>Active</th></tr>
                </thead>
                <tbody>
                  {payment.banks.map((b) => (
                    <tr key={b.id}>
                      <td className="td-strong">{b.name}</td>
                      <td><input value={b.account || ""} onChange={(e) => updateBank(b.id, "account", e.target.value)}
                        placeholder="Account number" style={{ width: 170, border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 8px", fontFamily: "inherit" }} /></td>
                      <td><input value={b.holder || ""} onChange={(e) => updateBank(b.id, "holder", e.target.value)}
                        placeholder="Holder name" style={{ width: 160, border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 8px", fontFamily: "inherit" }} /></td>
                      <td><input value={b.branch || ""} onChange={(e) => updateBank(b.id, "branch", e.target.value)}
                        placeholder="Branch" style={{ width: 120, border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 8px", fontFamily: "inherit" }} /></td>
                      <td>
                        <input type="checkbox" checked={!!b.active} onChange={(e) => updateBank(b.id, "active", e.target.checked)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <button className="btn btn-primary" onClick={() => savePayment(payment)} disabled={busy}>Save Bank Accounts</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
