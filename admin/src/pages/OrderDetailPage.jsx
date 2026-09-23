import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

const STATUS_PIPELINE = [
  "pending", "confirmed", "processing",
  "ready_for_delivery", "out_for_delivery", "delivered",
];

const STATUS_COLOR = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#8b5cf6",
  ready_for_delivery: "#06b6d4",
  out_for_delivery: "#f97316",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

const STATUS_NEXT_LABEL = {
  pending: "Confirm Order",
  confirmed: "Start Processing",
  processing: "Mark Ready for Delivery",
  ready_for_delivery: "Mark Out for Delivery",
  out_for_delivery: "Mark Delivered",
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  function loadOrder() {
    setLoading(true);
    api.get(`/admin/orders/${id}`)
      .then((r) => setOrder(r.data.order))
      .catch(() => setError("Failed to load order."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOrder(); }, [id]);

  async function advanceStatus() {
    setActionLoading(true);
    try {
      const currentIdx = STATUS_PIPELINE.indexOf(order.orderStatus);
      const nextStatus = STATUS_PIPELINE[currentIdx + 1];
      await api.patch(`/admin/orders/${id}/status`, { status: nextStatus });
      setSuccessMsg(`Order advanced to "${nextStatus.replace(/_/g, " ")}"`);
      loadOrder();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelOrder() {
    if (!window.confirm("Cancel this order?")) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: "cancelled" });
      setSuccessMsg("Order cancelled.");
      loadOrder();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to cancel.");
    } finally {
      setActionLoading(false);
    }
  }

  async function approveReceipt() {
    setActionLoading(true);
    try {
      await api.patch(`/admin/orders/${id}/payment`, { action: "verify" });
      setSuccessMsg("Receipt approved. Order confirmed.");
      loadOrder();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to approve.");
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectReceipt() {
    if (!rejectNote.trim()) { setError("Please enter a rejection reason."); return; }
    setActionLoading(true);
    try {
      await api.patch(`/admin/orders/${id}/payment`, { action: "reject", notes: rejectNote });
      setSuccessMsg("Receipt rejected. Customer notified.");
      setShowReject(false);
      setRejectNote("");
      loadOrder();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to reject.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="page-loading"><span className="spinner" /></div>;
  if (error && !order) return <div className="page-error">{error} <button onClick={() => navigate(-1)}>← Back</button></div>;

  const o = order || {};
  const currentIdx = STATUS_PIPELINE.indexOf(o.orderStatus);
  const canAdvance = currentIdx >= 0 && currentIdx < STATUS_PIPELINE.length - 1;
  const canCancel = ["pending", "confirmed"].includes(o.orderStatus);
  const isPendingReceipt = o.payment?.status === "pending_verification";

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">
          <button className="btn-link" onClick={() => navigate("/orders")}>← Orders</button>
          <span className="breadcrumb-sep">/</span>
          <strong>{o.orderNumber}</strong>
        </div>
        <div className="header-actions">
          {canCancel && (
            <button className="btn btn-danger" onClick={cancelOrder} disabled={actionLoading}>
              Cancel Order
            </button>
          )}
          {canAdvance && !isPendingReceipt && (
            <button className="btn btn-primary" onClick={advanceStatus} disabled={actionLoading}>
              {actionLoading ? <span className="btn-spinner" /> : STATUS_NEXT_LABEL[o.orderStatus]}
            </button>
          )}
        </div>
      </div>

      {successMsg && <div className="alert-success">{successMsg} <button onClick={() => setSuccessMsg("")}>×</button></div>}
      {error && <div className="alert-error">{error} <button onClick={() => setError("")}>×</button></div>}

      {/* Order Progress Tracker */}
      <div className="order-tracker">
        {STATUS_PIPELINE.map((s, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className={`tracker-step ${done ? "done" : ""} ${active ? "active" : ""}`}>
              <div className="tracker-dot" style={done ? { background: STATUS_COLOR[s] } : {}} />
              <span className="tracker-label">{s.replace(/_/g, " ")}</span>
              {i < STATUS_PIPELINE.length - 1 && (
                <div className={`tracker-line ${i < currentIdx ? "done" : ""}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="order-detail-grid">
        {/* Left Column */}
        <div className="order-left">
          {/* Items */}
          <div className="detail-card">
            <h2 className="detail-card-title">📦 Order Items</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(o.items || []).map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div className="product-cell">
                        {item.image && (
                          <img src={`http://localhost:5001${item.image}`} alt={item.name} className="product-thumb" />
                        )}
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td>{item.variantLabel || "—"}</td>
                    <td>{item.quantity}</td>
                    <td>{(item.price || 0).toLocaleString()} ETB</td>
                    <td><strong>{((item.price || 0) * item.quantity).toLocaleString()} ETB</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="order-totals">
              <div className="total-row"><span>Subtotal</span><span>{(o.subtotal || 0).toLocaleString()} ETB</span></div>
              {o.discount > 0 && <div className="total-row discount"><span>Discount</span><span>−{(o.discount || 0).toLocaleString()} ETB</span></div>}
              <div className="total-row"><span>Delivery Fee</span><span>{(o.deliveryFee || 0).toLocaleString()} ETB</span></div>
              <div className="total-row grand"><span>Total</span><span>{(o.total || 0).toLocaleString()} ETB</span></div>
            </div>
          </div>

          {/* Payment */}
          <div className="detail-card">
            <h2 className="detail-card-title">💳 Payment</h2>
            <div className="info-grid">
              <div className="info-item"><span className="info-label">Method</span><span className="info-value capitalize">{o.payment?.method?.replace(/_/g, " ")}</span></div>
              <div className="info-item"><span className="info-label">Status</span>
                <span className="info-value">
                  <span className="status-badge" style={{ "--badge-color": isPendingReceipt ? "#f59e0b" : o.payment?.status === "paid" ? "#10b981" : "#6b7280" }}>
                    {o.payment?.status?.replace(/_/g, " ")}
                  </span>
                </span>
              </div>
              {o.payment?.bank && <div className="info-item"><span className="info-label">Bank</span><span className="info-value">{o.payment.bank}</span></div>}
              {o.payment?.receiptUrl && (
                <div className="info-item full">
                  <span className="info-label">Receipt</span>
                  <a href={`http://localhost:5001${o.payment.receiptUrl}`} target="_blank" rel="noopener noreferrer">
                    <img src={`http://localhost:5001${o.payment.receiptUrl}`} alt="Receipt" className="receipt-preview" />
                  </a>
                </div>
              )}
            </div>

            {/* Receipt Verification Actions */}
            {isPendingReceipt && (
              <div className="receipt-actions">
                <div className="receipt-alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Bank transfer receipt awaiting your verification
                </div>
                {!showReject ? (
                  <div className="receipt-btns">
                    <button className="btn btn-success" onClick={approveReceipt} disabled={actionLoading}>
                      ✓ Approve Receipt
                    </button>
                    <button className="btn btn-danger" onClick={() => setShowReject(true)}>
                      ✗ Reject Receipt
                    </button>
                  </div>
                ) : (
                  <div className="reject-form">
                    <textarea
                      placeholder="Reason for rejection (shown to customer)…"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={3}
                    />
                    <div className="receipt-btns">
                      <button className="btn btn-danger" onClick={rejectReceipt} disabled={actionLoading}>
                        Confirm Rejection
                      </button>
                      <button className="btn btn-secondary" onClick={() => setShowReject(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="order-right">
          {/* Customer */}
          <div className="detail-card">
            <h2 className="detail-card-title">👤 Customer</h2>
            <div className="info-grid">
              <div className="info-item"><span className="info-label">Name</span><span className="info-value">{o.customer?.name || "—"}</span></div>
              <div className="info-item"><span className="info-label">Email</span><span className="info-value">{o.customer?.email || "—"}</span></div>
              <div className="info-item"><span className="info-label">Phone</span><span className="info-value">{o.customer?.phone || "—"}</span></div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="detail-card">
            <h2 className="detail-card-title">📍 Delivery Address</h2>
            <div className="address-block">
              <p><strong>{o.address?.fullName}</strong></p>
              <p>{o.address?.phone}</p>
              <p>{o.address?.region}, {o.address?.city}</p>
              {o.address?.subCity && <p>Sub-city: {o.address.subCity}</p>}
              {o.address?.woreda && <p>Woreda: {o.address.woreda}</p>}
              {o.address?.specificAddress && <p>{o.address.specificAddress}</p>}
              {o.address?.instructions && <p className="text-muted">"{o.address.instructions}"</p>}
            </div>
          </div>

          {/* Timeline */}
          <div className="detail-card">
            <h2 className="detail-card-title">📋 Timeline</h2>
            <div className="timeline">
              {(o.timeline || []).map((event, i) => (
                <div key={i} className="timeline-event">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <p className="timeline-status">{event.status?.replace(/_/g, " ")}</p>
                    {event.note && <p className="timeline-note">{event.note}</p>}
                    <p className="timeline-time">{new Date(event.at || event.timestamp).toLocaleString("en-ET")}</p>
                  </div>
                </div>
              ))}
              {(!o.timeline || o.timeline.length === 0) && (
                <p className="text-muted">No timeline events yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
