import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";

const ADJUST_TYPES = ["add", "remove", "set"];
const REASONS = ["restock", "manual_adjustment", "damaged", "cancelled_order", "return"];

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ total: 0, lowStock: 0, outOfStock: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [adjustModal, setAdjustModal] = useState(null); // product object
  const [historyModal, setHistoryModal] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ type: "add", quantity: "", reason: "restock", notes: "" });
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchInventory = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    api.get("/admin/inventory", { params })
      .then((r) => {
        setProducts(r.data.products || []);
        setSummary({
          total: r.data.totalProducts || 0,
          lowStock: r.data.lowStockCount || 0,
          outOfStock: r.data.outOfStockCount || 0,
        });
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  function openAdjust(product) {
    setAdjustModal(product);
    setAdjustForm({ type: "add", quantity: "", reason: "restock", notes: "" });
    setError("");
  }

  async function openHistory(product) {
    setHistoryModal(product);
    setHistoryLoading(true);
    try {
      const r = await api.get(`/admin/inventory/${product._id}/history`);
      setHistory(r.data.transactions || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleAdjust() {
    if (!adjustForm.quantity || Number(adjustForm.quantity) <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }
    setAdjusting(true);
    setError("");
    try {
      await api.post(`/admin/inventory/${adjustModal._id}/adjust`, {
        type: adjustForm.type,
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason,
        notes: adjustForm.notes,
      });
      setSuccess(`Stock adjusted for "${adjustModal.name}"`);
      setAdjustModal(null);
      fetchInventory();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to adjust stock.");
    } finally {
      setAdjusting(false);
    }
  }

  function computeNewStock(current) {
    const q = Number(adjustForm.quantity) || 0;
    if (adjustForm.type === "add") return current + q;
    if (adjustForm.type === "remove") return Math.max(0, current - q);
    if (adjustForm.type === "set") return q;
    return current;
  }

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-desc">Monitor and manage product stock levels</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="inv-summary">
        <div className="inv-stat">
          <span className="inv-stat-value">{summary.total}</span>
          <span className="inv-stat-label">Total Products</span>
        </div>
        <div className="inv-stat warn">
          <span className="inv-stat-value">{summary.lowStock}</span>
          <span className="inv-stat-label">Low Stock</span>
        </div>
        <div className="inv-stat danger">
          <span className="inv-stat-value">{summary.outOfStock}</span>
          <span className="inv-stat-label">Out of Stock</span>
        </div>
      </div>

      {error && <div className="alert-error">{error} <button onClick={() => setError("")}>×</button></div>}
      {success && <div className="alert-success">{success} <button onClick={() => setSuccess("")}>×</button></div>}

      {/* Search */}
      <div className="toolbar">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search products or SKU…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="table-loading"><span className="spinner" /> Loading inventory…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const available = (p.stock || 0) - (p.reservedStock || 0);
                const isOut = p.stock <= 0;
                const isLow = !isOut && p.stock <= p.lowStockThreshold;
                return (
                  <tr key={p._id}>
                    <td>
                      <div className="product-cell">
                        {p.images?.[0] ? (
                          <img src={`http://localhost:5001${p.images[0]}`} alt={p.name} className="product-thumb" />
                        ) : <div className="product-thumb-placeholder">📦</div>}
                        <div>
                          <strong>{p.name}</strong>
                          <div className="text-muted text-sm">{p.category?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td><code className="sku-code">{p.sku}</code></td>
                    <td><strong>{p.stock}</strong></td>
                    <td>{p.reservedStock || 0}</td>
                    <td>{available}</td>
                    <td>{p.lowStockThreshold}</td>
                    <td>
                      <span className={`stock-pill ${isOut ? "out" : isLow ? "low" : "ok"}`}>
                        {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm btn-primary" onClick={() => openAdjust(p)}>Adjust</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => openHistory(p)}>History</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && products.length === 0 && (
                <tr><td colSpan={8} className="empty-row">No products found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAdjustModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Adjust Stock — {adjustModal.name}</h2>
              <button className="modal-close" onClick={() => setAdjustModal(null)}>×</button>
            </div>
            {error && <div className="alert-error">{error}</div>}
            <div className="modal-body">
              <div className="stock-current-info">
                <span>Current stock: <strong>{adjustModal.stock}</strong></span>
                {adjustForm.quantity && (
                  <span> → New stock: <strong>{computeNewStock(adjustModal.stock)}</strong></span>
                )}
              </div>
              <div className="form-field">
                <label>Adjustment Type</label>
                <div className="radio-group">
                  {ADJUST_TYPES.map((t) => (
                    <label key={t} className="radio-option">
                      <input
                        type="radio"
                        name="adj-type"
                        value={t}
                        checked={adjustForm.type === t}
                        onChange={() => setAdjustForm((f) => ({ ...f, type: t }))}
                      />
                      <span className="capitalize">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <label>Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="Enter quantity"
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label>Reason</label>
                <select
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Notes (optional)</label>
                <textarea
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="e.g. Received new shipment"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAdjustModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdjust} disabled={adjusting}>
                {adjusting ? <span className="btn-spinner" /> : "Apply Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setHistoryModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>Stock History — {historyModal.name}</h2>
              <button className="modal-close" onClick={() => setHistoryModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {historyLoading ? (
                <div className="table-loading"><span className="spinner" /></div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Change</th>
                      <th>Before</th>
                      <th>After</th>
                      <th>Reason</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((tx) => (
                      <tr key={tx._id}>
                        <td>{new Date(tx.createdAt).toLocaleDateString("en-ET")}</td>
                        <td className="capitalize">{tx.type?.replace(/_/g, " ")}</td>
                        <td>
                          <span style={{ color: tx.change > 0 ? "#10b981" : "#ef4444" }}>
                            {tx.change > 0 ? "+" : ""}{tx.change}
                          </span>
                        </td>
                        <td>{tx.previousStock}</td>
                        <td><strong>{tx.newStock}</strong></td>
                        <td className="capitalize">{tx.reason?.replace(/_/g, " ")}</td>
                        <td>{tx.performedBy?.name || "System"}</td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr><td colSpan={7} className="empty-row">No transactions found</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setHistoryModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
