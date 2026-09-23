import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import Spinner from '../../components/Spinner'

export default function Notifications() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    api
      .get('/api/notifications')
      .then((res) => {
        setItems(res.notifications || [])
        setUnread(res.unread || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const open = async (n) => {
    if (!n.read) {
      try { await api.post(`/api/notifications/${n.id}/read`) } catch { /* ignore */ }
    }
    if (n.link) navigate(n.link)
    else load()
  }

  const markAll = async () => {
    try { await api.post('/api/notifications/mark-all-read') } catch { /* ignore */ }
    load()
  }

  const remove = async (n) => {
    try { await api.delete(`/api/notifications/${n.id}`) } catch { /* ignore */ }
    load()
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Notifications {unread > 0 && <span className="notif-pill">{unread} new</span>}</h3>
        {items.length > 0 && (
          <button type="button" className="text-link" onClick={markAll}>Mark all as read</button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="muted">No notifications yet. Order updates, payment confirmations and delivery news will appear here.</p>
      ) : (
        <div className="notif-page-list">
          {items.map((n) => (
            <div key={n.id} className={`notif-page-item ${n.read ? '' : 'unread'}`}>
              <button type="button" className="notif-page-main" onClick={() => open(n)}>
                <span className="notif-title">{n.title}</span>
                {n.body && <span className="notif-body">{n.body}</span>}
                <span className="notif-time">{new Date(n.createdAt).toLocaleString()}</span>
              </button>
              <button type="button" className="notif-delete" title="Delete" onClick={() => remove(n)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
