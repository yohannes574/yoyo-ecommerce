import { useEffect, useState } from "react";
import api from "../api/axios";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "", label: "All" },
];

function Stars({ value }) {
  return (
    <span className="stars" title={`${value} / 5`}>
      {"★".repeat(Math.round(value))}
      <span className="stars-empty">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (tab) params.set("status", tab);
    if (search.trim()) params.set("search", search.trim());
    api
      .get(`/admin/reviews?${params.toString()}`)
      .then((r) => {
        setReviews(r.data.reviews || []);
        setStatusCounts(r.data.statusCounts || { pending: 0, approved: 0, rejected: 0 });
        setPages(r.data.pages || 1);
        setTotal(r.data.total || 0);
      })
      .catch(() => setError("Failed to load reviews."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  async function moderate(review, status) {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/admin/reviews/${review.id}/status`, { status });
      setSuccess(`Review ${status}.`);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update review.");
    }
  }

  async function remove(review) {
    if (!window.confirm(`Delete the review of "${review.productName}" by ${review.customerName}?`)) return;
    setError("");
    try {
      await api.delete(`/admin/reviews/${review.id}`);
      setSuccess("Review deleted.");
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to delete review.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reviews</h1>
          <p className="page-desc">Moderate customer reviews before they appear on the storefront</p>
        </div>
        <div className="reviews-count-badges">
          <span className="badge">{statusCounts.pending} pending</span>
          <span className="badge badge-info">{statusCounts.approved} approved</span>
          <span className="badge badge-danger">{statusCounts.rejected} rejected</span>
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
            {t.key && statusCounts[t.key] > 0 && <span className="tab-count">{statusCounts[t.key]}</span>}
          </button>
        ))}
        <form
          className="table-search"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load();
          }}
        >
          <input
            placeholder="Search product, customer, text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-sm btn-secondary" type="submit">Search</button>
        </form>
      </div>

      {loading ? (
        <div className="page-loading"><span className="spinner" /></div>
      ) : reviews.length === 0 ? (
        <div className="empty-state">No reviews here yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Customer</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Status</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td className="td-strong">{r.productName || "—"}</td>
                  <td>{r.customerName || "—"}</td>
                  <td><Stars value={r.rating} /></td>
                  <td className="td-comment">
                    <span className={expanded === r.id ? "" : "clamp-2"}>{r.comment || <em className="muted">No comment</em>}</span>
                    {r.comment && r.comment.length > 90 && (
                      <button className="text-link" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                        {expanded === r.id ? "Show less" : "Show more"}
                      </button>
                    )}
                  </td>
                  <td className="td-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td><span className={`status-pill small ${r.status}`}>{r.status}</span></td>
                  <td className="td-actions">
                    {r.status !== "approved" && (
                      <button className="btn btn-sm btn-primary" onClick={() => moderate(r, "approved")}>Approve</button>
                    )}
                    {r.status !== "rejected" && (
                      <button className="btn btn-sm btn-secondary" onClick={() => moderate(r, "rejected")}>Reject</button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => remove(r)}>Delete</button>
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
          <span className="muted">Page {page} of {pages} ({total} total)</span>
          <button className="btn btn-sm btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
