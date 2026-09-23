import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const STATUS_COLOR = { active: "#10b981", draft: "#f59e0b" };

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    api.get("/admin/categories").then((r) => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (categoryFilter) params.category = categoryFilter;
    if (statusFilter) params.status = statusFilter;
    if (stockFilter) params.stockStatus = stockFilter;
    api.get("/admin/products", { params })
      .then((r) => {
        setProducts(r.data.products || []);
        setTotalPages(r.data.pagination?.pages || 1);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [search, categoryFilter, statusFilter, stockFilter, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === "active" ? "draft" : "active";
    try {
      await api.put(`/admin/products/${id}`, { status: newStatus });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
    } catch { /* ignore */ }
  }

  async function deleteProduct(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert(e.response?.data?.message || "Failed to delete product.");
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
          <h1 className="page-title">Products</h1>
          <p className="page-desc">Manage your product catalog</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/products/new")}>
          + Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search products…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        <div className="filter-group">
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
          <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}>
            <option value="">All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div className="table-loading"><span className="spinner" /> Loading products…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.images?.[0] ? (
                      <img src={`http://localhost:5001${p.images[0]}`} alt={p.name} className="product-thumb" />
                    ) : (
                      <div className="product-thumb-placeholder">📦</div>
                    )}
                  </td>
                  <td>
                    <div className="product-name-cell">
                      <strong>{p.name}</strong>
                      {p.brand && <span className="text-muted text-sm">{p.brand}</span>}
                    </div>
                  </td>
                  <td><code className="sku-code">{p.sku}</code></td>
                  <td>{p.category?.name || "—"}</td>
                  <td>
                    <div>
                      {p.salePrice ? (
                        <>
                          <strong>{(p.salePrice || 0).toLocaleString()} ETB</strong>
                          <span className="original-price">{(p.price || 0).toLocaleString()}</span>
                        </>
                      ) : (
                        <strong>{(p.price || 0).toLocaleString()} ETB</strong>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`stock-pill ${p.stock <= 0 ? "out" : p.stock <= p.lowStockThreshold ? "low" : "ok"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge" style={{ "--badge-color": STATUS_COLOR[p.status] || "#6b7280" }}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/products/${p.id}/edit`)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => toggleStatus(p.id, p.status)}
                        title={p.status === "active" ? "Set to draft" : "Activate"}
                      >
                        {p.status === "active" ? "⏸" : "▶"}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteProduct(p.id, p.name)}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && products.length === 0 && (
                <tr><td colSpan={8} className="empty-row">No products found</td></tr>
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
    </div>
  );
}
