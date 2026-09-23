import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailModal, setDetailModal] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (search) params.search = search;
    api.get("/admin/customers", { params })
      .then((r) => {
        setCustomers(r.data.customers || []);
        setTotalPages(r.data.pagination?.pages || 1);
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  async function openDetail(customer) {
    setDetailModal(customer);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const r = await api.get(`/admin/customers/${customer.id || customer._id}`);
      setDetailData({ ...r.data.customer, addresses: r.data.addresses || [], orders: r.data.orders || [] });
    } catch {
      setDetailData(customer);
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleStatus(customerId, currentStatus) {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    try {
      await api.patch(`/admin/customers/${customerId}/status`, { status: newStatus });
      setSuccess(`Customer ${newStatus === "disabled" ? "deactivated" : "activated"}.`);
      setCustomers((prev) =>
        prev.map((x) => x.id === customerId ? { ...x, status: newStatus } : x)
      );
      if (detailData?.id === customerId) {
        setDetailData((d) => ({ ...d, status: newStatus }));
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update status.");
    }
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
          <h1 className="page-title">Customers</h1>
          <p className="page-desc">Manage your customer accounts</p>
        </div>
      </div>

      {error && <div className="alert-error">{error} <button onClick={() => setError("")}>×</button></div>}
      {success && <div className="alert-success">{success} <button onClick={() => setSuccess("")}>×</button></div>}

      <div className="toolbar">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name, email or phone…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="table-loading"><span className="spinner" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="customer-cell">
                      <div className="customer-avatar">{c.name?.[0]?.toUpperCase() || "?"}</div>
                      <strong>{c.name}</strong>
                    </div>
                  </td>
                  <td>{c.email}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.orderCount ?? "—"}</td>
                  <td>{c.totalSpent ? `${c.totalSpent.toLocaleString()} ETB` : "—"}</td>
                  <td>
                    <span className="status-badge" style={{
                      "--badge-color": c.status === "active" ? "#10b981" : c.status === "disabled" ? "#ef4444" : "#6b7280"
                    }}>
                      {c.status || "active"}
                    </span>
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString("en-ET")}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-sm btn-secondary" onClick={() => openDetail(c)}>View</button>
                      <button
                        className={`btn btn-sm ${c.status === "disabled" ? "btn-primary" : "btn-danger"}`}
                        onClick={() => toggleStatus(c.id, c.status)}
                      >
                        {c.status === "disabled" ? "Enable" : "Disable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && customers.length === 0 && (
                <tr><td colSpan={8} className="empty-row">No customers found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button className="btn btn-secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
        </div>
      )}

      {/* Customer Detail Modal */}
      {detailModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDetailModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="customer-avatar lg">{detailModal.name?.[0]?.toUpperCase()}</div>
                <div>
                  <h2>{detailModal.name}</h2>
                  <span className="text-muted">{detailModal.email}</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setDetailModal(null)}>×</button>
            </div>

            {detailLoading ? (
              <div className="table-loading"><span className="spinner" /></div>
            ) : detailData ? (
              <div className="modal-body">
                <div className="info-grid">
                  <div className="info-item"><span className="info-label">Phone</span><span className="info-value">{detailData.phone || "—"}</span></div>
                  <div className="info-item"><span className="info-label">Status</span>
                    <span className="status-badge" style={{ "--badge-color": detailData.status === "active" ? "#10b981" : "#ef4444" }}>
                      {detailData.status || "active"}
                    </span>
                  </div>
                  <div className="info-item"><span className="info-label">Total Orders</span><span className="info-value">{detailData.totalOrders ?? detailData.orderCount ?? 0}</span></div>
                  <div className="info-item"><span className="info-label">Total Spent</span><span className="info-value">{detailData.totalSpent ? `${detailData.totalSpent.toLocaleString()} ETB` : "—"}</span></div>
                  <div className="info-item"><span className="info-label">Joined</span><span className="info-value">{new Date(detailData.createdAt).toLocaleDateString("en-ET")}</span></div>
                </div>

                {detailData.addresses?.length > 0 && (
                  <div className="customer-section">
                    <h3>📍 Saved Addresses</h3>
                    {detailData.addresses.map((addr, i) => (
                      <div key={i} className="address-card">
                        <p><strong>{addr.fullName}</strong> {addr.isDefault && <span className="badge-default">Default</span>}</p>
                        <p>{addr.phone} · {addr.region}, {addr.city}</p>
                      </div>
                    ))}
                  </div>
                )}

                {(detailData.orders || detailData.recentOrders)?.length > 0 && (
                  <div className="customer-section">
                    <h3>📦 Recent Orders</h3>
                    <table className="data-table">
                      <thead>
                        <tr><th>Order #</th><th>Date</th><th>Total</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {(detailData.orders || detailData.recentOrders).map((o) => (
                          <tr key={o.id || o._id} className="clickable-row" onClick={() => { setDetailModal(null); navigate(`/orders/${o.id || o._id}`); }}>
                            <td><strong>{o.orderNumber}</strong></td>
                            <td>{new Date(o.createdAt).toLocaleDateString("en-ET")}</td>
                            <td>{(o.total || 0).toLocaleString()} ETB</td>
                            <td>
                              <span className="status-badge" style={{ "--badge-color": "#6b7280" }}>
                                {o.orderStatus?.replace(/_/g, " ")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            <div className="modal-footer">
              <button
                className={`btn ${detailModal.status === "disabled" ? "btn-primary" : "btn-danger"}`}
                onClick={() => toggleStatus(detailModal.id || detailModal._id, detailData?.status || detailModal.status)}
              >
                {detailModal.status === "disabled" ? "Enable Customer" : "Disable Customer"}
              </button>
              <button className="btn btn-secondary" onClick={() => setDetailModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
