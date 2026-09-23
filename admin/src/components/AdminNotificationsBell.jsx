import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function AdminNotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(() => {
    api
      .get("/admin/notifications")
      .then((res) => {
        setItems(res.data.notifications || []);
        setUnread(res.data.unread || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const openItem = async (n) => {
    if (!n.read) {
      try {
        await api.post(`/admin/notifications/${n.id}/read`);
      } catch { /* ignore */ }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
    else load();
  };

  const markAll = async () => {
    try {
      await api.post("/admin/notifications/mark-all-read");
      load();
    } catch { /* ignore */ }
  };

  return (
    <div className="admin-bell-wrap" ref={ref}>
      <button type="button" className="admin-bell" onClick={() => setOpen((o) => !o)} title="Notifications">
        🔔
        {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="admin-notif-dropdown">
          <div className="notif-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="btn-link" onClick={markAll}>Mark all read</button>
            )}
          </div>
          <div className="admin-notif-list">
            {items.length === 0 ? (
              <p className="notif-empty muted">No notifications yet.</p>
            ) : (
              items.slice(0, 8).map((n) => (
                <button type="button" key={n.id} className={`admin-notif-item ${n.read ? "" : "unread"}`} onClick={() => openItem(n)}>
                  <span className="admin-notif-title">{n.title}</span>
                  {n.body && <span className="admin-notif-body">{n.body}</span>}
                  <span className="admin-notif-time">{new Date(n.createdAt).toLocaleString()}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
