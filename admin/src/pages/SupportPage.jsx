import { useEffect, useState } from "react";
import api from "../api/axios";
import { getImageUrl } from "../utils/imageUrl";

const TABS = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "waiting_customer", label: "Waiting for Customer" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
  { key: "", label: "All" },
];

const STATUS_OPTIONS = ["open", "in_progress", "waiting_customer", "resolved", "closed"];

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [tab, setTab] = useState("open");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function load() {
    const params = new URLSearchParams();
    if (tab) params.set("status", tab);
    if (search.trim()) params.set("search", search.trim());
    api
      .get(`/admin/support?${params.toString()}`)
      .then((r) => {
        setTickets(r.data.tickets || []);
        setStatusCounts(r.data.statusCounts || {});
      })
      .catch(() => setError("Failed to load tickets."))
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function openTicket(t) {
    setError("");
    try {
      const res = await api.get(`/admin/support/${t.id}`);
      setActive(res.data.ticket);
      setStatus(res.data.ticket.status);
      setPriority(res.data.ticket.priority);
      setAssignedTo(res.data.ticket.assignedTo || "");
      setReply("");
    } catch {
      setError("Failed to load ticket.");
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/admin/support/${active.id}/reply`, { message: reply });
      setReply("");
      setSuccess("Reply sent.");
      await openTicket(active);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reply.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMeta() {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/admin/support/${active.id}`, { status, priority, assignedTo });
      setSuccess("Ticket updated.");
      await openTicket(active);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update ticket.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Support</h1>
          <p className="page-desc">Customer support ticket inbox</p>
        </div>
        <div className="reviews-count-badges">
          {TABS.filter((t) => t.key).map((t) => (
            <span key={t.key} className="badge">{statusCounts[t.key] ?? 0} {t.label}</span>
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
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <form
          className="table-search"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <input
            placeholder="Search ticket, subject, customer, order…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-sm btn-secondary" type="submit">Search</button>
        </form>
      </div>

      {tickets.length === 0 ? (
        <div className="empty-state">No tickets here.</div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Subject</th>
                <th>Customer</th>
                <th>Order</th>
                <th>Category</th>
                <th>Messages</th>
                <th>Last activity</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="td-strong">{t.ticketNumber}</td>
                  <td className="td-comment"><span className="clamp-2">{t.subject}</span></td>
                  <td>{t.customerName}</td>
                  <td>{t.orderNumber || "—"}</td>
                  <td className="capitalize">{t.category}</td>
                  <td>{t.messageCount}</td>
                  <td className="td-muted">{new Date(t.lastMessageAt).toLocaleString()}</td>
                  <td>
                    <span className={`status-pill small ${t.status === "resolved" || t.status === "closed" ? "approved" : t.status === "waiting_customer" ? "pending" : "rejected"}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="td-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => openTicket(t)}>Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Thread modal */}
      {active && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setActive(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>{active.ticketNumber} — {active.subject}</h2>
              <button className="modal-close" onClick={() => setActive(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Customer</span>
                  <span className="info-value">{active.customerName} ({active.customerEmail})</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Order</span>
                  <span className="info-value">{active.orderNumber || "—"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Category</span>
                  <span className="info-value capitalize">{active.category}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Assigned to</span>
                  <span className="info-value">{active.assignedTo || "Unassigned"}</span>
                </div>
              </div>

              <div className="timeline">
                {active.messages.map((m) => (
                  <div key={m._id} className="timeline-event">
                    <div className="timeline-dot" style={{ background: m.sender === "admin" ? "#10b981" : "#6366f1" }} />
                    <div>
                      <div className="timeline-status">
                        {m.sender === "admin" ? "🧑‍💼" : "🧑"} {m.senderName || m.sender}
                      </div>
                      <div className="timeline-note" style={{ whiteSpace: "pre-wrap" }}>{m.message}</div>
                      {m.attachment && (
                        <a
                          href={getImageUrl(m.attachment)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-link"
                        >
                          📎 View attachment
                        </a>
                      )}
                      <div className="timeline-time">{new Date(m.at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={sendReply} className="form-field">
                <label>Reply to customer</label>
                <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={busy || !reply.trim()}>
                    Send reply
                  </button>
                </div>
              </form>

              <div className="form-grid-3">
                <div className="form-field">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Assigned to</label>
                  <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Staff name" />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" onClick={saveMeta} disabled={busy}>Save ticket info</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
