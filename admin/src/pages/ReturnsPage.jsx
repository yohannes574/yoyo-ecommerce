import { useEffect, useState } from "react";
import api from "../api/axios";

const TABS = [
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "received", label: "Received" },
  { key: "refunded", label: "Refunded" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
  { key: "", label: "All" },
];

const NEXT_ACTIONS = {
  requested: [
    { status: "approved", label: "Approve", kind: "btn-primary" },
    { status: "rejected", label: "Reject", kind: "btn-danger" },
  ],
  approved: [
    { status: "received", label: "Mark Received", kind: "btn-primary" },
    { status: "rejected", label: "Reject", kind: "btn-danger" },
  ],
  received: [{ status: "refunded", label: "Process Refund", kind: "btn-success" }],
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [tab, setTab] = useState("requested");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (tab) params.set("status", tab);
    api
      .get(`/admin/returns?${params.toString()}`)
      .then((r) => {
        setReturns(r.data.returns || []);
        setStatusCounts(r.data.statusCounts || {});
        setPages(r.data.pages || 1);
      })
      .catch(() => setError("Failed to load returns."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  async function openDetail(r) {
    setError("");
    try {
      const res = await api.get(`/admin/returns/${r.id}`);
      setDetail(res.data.return);
      setNote(res.data.return.adminNote || "");
    } catch {
      setError("Failed to load return detail.");
    }
  }

  async function updateStatus(returnId, status) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.patch(`/admin/returns/${returnId}/status`, { status, note });
      setSuccess(res.data.message || `Return ${status}.`);
      setDetail(null);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update return.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Returns</h1>
          <p className="page-desc">Review return requests, track received items and process refunds</p>
        </div>
        <div className="reviews-count-badges">
          {["requested", "approved", "received", "refunded"].map((s) => (
            <span key={s} className="badge">{statusCounts[s] ?? 0} {s}</span>
          ))}
        </div>
      </div>

      {error && <div className="alert-error">{error} <button onClick={() => setError("")}>×</button></div>}
      {success && <div className="alert-success">{success} <button onClick={() => setSuccess("")}>×</button></div>}

      <div className="tabs-row">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? "active" : ""}`}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading"><span className="spinner" /></div>
      ) : returns.length === 0 ? (
        <div className="empty-state">No returns here yet.</div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Return #</th>
                <th>Order</th>
                <th>Items</th>
                <th>Reason</th>
                <th>Refund</th>
                <th>Date</th>
                <th>Status</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id}>
                  <td className="td-strong">{r.returnNumber}</td>
                  <td>{r.orderNumber}</td>
                  <td>{(r.items || []).reduce((s, i) => s + i.qty, 0)} item(s)</td>
                  <td className="td-comment"><span className="clamp-2">{r.reason}</span></td>
                  <td>{(r.refundAmount || 0).toLocaleString()} ETB</td>
                  <td className="td-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td><span className={`status-pill small ${r.status === "refunded" ? "approved" : r.status === "rejected" || r.status === "cancelled" ? "rejected" : "pending"}`}>{r.status}</span></td>
                  <td className="td-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => openDetail(r)}>View</button>
                    {(NEXT_ACTIONS[r.status] || []).map((a) => (
                      <button
                        key={a.status}
                        className={`btn btn-sm ${a.kind}`}
                        onClick={() => updateStatus(r.id, a.status)}
                        disabled={busy}
                      >
                        {a.label}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="pagination">
          <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="muted">Page {page} of {pages}</span>
          <button className="btn btn-sm btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>Return {detail.returnNumber} — order {detail.orderNumber}</h2>
              <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Customer</span>
                  <span className="info-value">{detail.customer?.name || "—"} ({detail.customer?.phone || "no phone"})</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Refund amount</span>
                  <span className="info-value">{(detail.refundAmount || 0).toLocaleString()} ETB</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Refund method</span>
                  <span className="info-value capitalize">{String(detail.refundMethod || "").replace("_", " ")}</span>
                </div>
                {detail.refundAccount && (
                  <div className="info-item">
                    <span className="info-label">Refund account</span>
                    <span className="info-value">{detail.refundAccount}</span>
                  </div>
                )}
                <div className="info-item full">
                  <span className="info-label">Reason</span>
                  <span className="info-value">{detail.reason}</span>
                </div>
                {detail.description && (
                  <div className="info-item full">
                    <span className="info-label">Description</span>
                    <span className="info-value">{detail.description}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="info-label">Items</span>
                <table className="data-table" style={{ marginTop: 6 }}>
                  <thead>
                    <tr><th>Product</th><th>Variant</th><th>Qty</th><th>Price</th></tr>
                  </thead>
                  <tbody>
                    {(detail.items || []).map((it, i) => (
                      <tr key={i}>
                        <td>{it.name}</td>
                        <td>{it.variantName || "—"}</td>
                        <td>{it.qty}</td>
                        <td>{it.price?.toLocaleString()} ETB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detail.evidence?.length > 0 && (
                <div>
                  <span className="info-label">Evidence</span>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {detail.evidence.map((url, i) => (
                      <a key={i} href={`http://localhost:5001${url}`} target="_blank" rel="noreferrer">
                        <img src={`http://localhost:5001${url}`} alt={`evidence ${i + 1}`} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="info-label">Timeline</span>
                <div className="timeline" style={{ marginTop: 6 }}>
                  {(detail.timeline || []).map((t, i) => (
                    <div key={i} className="timeline-event">
                      <div className="timeline-dot" />
                      <div>
                        <div className="timeline-status capitalize">{t.status}</div>
                        {t.note && <div className="timeline-note">{t.note}</div>}
                        <div className="timeline-time">{new Date(t.at).toLocaleString()} • {t.by}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-field">
                <label>Admin note (sent to customer on status change)</label>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Item must be unused with original packaging" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
              {(NEXT_ACTIONS[detail.status] || []).map((a) => (
                <button
                  key={a.status}
                  className={`btn ${a.kind}`}
                  onClick={() => updateStatus(detail.id, a.status)}
                  disabled={busy}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
