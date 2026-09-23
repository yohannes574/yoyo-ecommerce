import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { Icon } from './Icons'

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)
  const pollRef = useRef(null)

  const load = useCallback(() => {
    if (!user) return
    api
      .get('/notifications')
      .then((res) => {
        setItems(res.notifications || [])
        setUnread(res.unread || 0)
      })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    load()
    pollRef.current = setInterval(load, 30000) // light polling
    return () => clearInterval(pollRef.current)
  }, [load])

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markRead = async (n) => {
    if (!n.read) {
      try {
        await api.post(`/api/notifications/${n.id}/read`)
      } catch { /* ignore */ }
    }
    setOpen(false)
    if (n.link) navigate(n.link)
    else load()
  }

  const markAll = async () => {
    try {
      await api.post('/notifications/mark-all-read')
      load()
    } catch { /* ignore */ }
  }

  if (!user) return null

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button
        type="button"
        className="notif-bell"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon.Bell size={20} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="text-link" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-list">
            {items.length === 0 ? (
              <p className="muted notif-empty">No notifications yet.</p>
            ) : (
              items.slice(0, 8).map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className={`notif-item ${n.read ? '' : 'unread'}`}
                  onClick={() => markRead(n)}
                >
                  <span className="notif-title">{n.title}</span>
                  {n.body && <span className="notif-body">{n.body}</span>}
                  <span className="notif-time">{new Date(n.createdAt).toLocaleString()}</span>
                </button>
              ))
            )}
          </div>
          <div className="notif-foot">
            <Link to="/account/notifications" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

