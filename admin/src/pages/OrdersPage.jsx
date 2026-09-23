import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "ready_for_delivery", label: "Ready" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
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

function StatusBadge({ status }) {
  return (
    <span className="status-badge" style={{ "--badge-color": STATUS_COLOR[status] || "#6b7280" }}>
      {status?.replace(/_/g, " ") || "—"}
    </span>
  );
}

function PaymentBadge({ status }) {
  const colors = {
    paid: "#10b981",
    pending_verification: "#f59e0b",
    cod: "#6b7280",
    failed: "#ef4444",
    rejected: "#ef4444",
  };
  return (
    <span className="status-badge" style={{ "--badge-color": colors[status] || "#6b7280" }}>
      {status?.replace(/_/g, " ") || "—"}
    </span>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (activeTab) params.status = activeTab;
    if (search) params.search = search;
    api.get("/admin/orders", { params })
      .then((r) => {
        setOrders(r.data.orders || []);
        setTotalPages(r.data.pagination?.pages || 1);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [activeTab, search, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function handleTabChange(key) {
    setActiveTab(key);
    setPage(1);
  }

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-desc">Manage and track all customer orders</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? "active" : ""}`}
            onClick={() => handleTabChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="toolbar">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search order number or customer…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div className="table-loading"><span className="spinner" /> Loading orders…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Pay Status</th>
                <th>Order Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><strong>{o.orderNumber}</strong></td>
                  <td>
                    <div>{o.customer?.name || o.address?.fullName || "—"}</div>
                    <div className="text-muted text-sm">{o.customer?.phone || ""}</div>
                  </td>
                  <td>{new Date(o.createdAt).toLocaleDateString("en-ET")}</td>
                  <td><strong>{(o.total || 0).toLocaleString()} ETB</strong></td>
                  <td className="capitalize">{o.payment?.method?.replace(/_/g, " ")}</td>
                  <td><PaymentBadge status={o.payment?.status} /></td>
                  <td><StatusBadge status={o.orderStatus} /></td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={8} className="empty-row">No orders found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >← Prev</button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button
            className="btn btn-secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >Next →</button>
        </div>
      )}
    </div>
  );
}
