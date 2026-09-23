import { useEffect, useState, useCallback } from 'react'
import api from '../../api'
import Spinner from '../../components/Spinner'

const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_customer: 'Waiting for your reply',
  resolved: 'Resolved',
  closed: 'Closed',
}

const CATEGORIES = [
  ['orders', 'Orders'],
  ['payments', 'Payments'],
  ['delivery', 'Delivery'],
  ['returns', 'Returns'],
  ['product', 'Product question'],
  ['account', 'Account'],
  ['other', 'Other'],
]

const EMPTY_FORM = { subject: '', category: 'orders', orderNumber: '', message: '', attachment: '' }

export default function SupportCenter() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // list | new | thread
  const [active, setActive] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(() => {
    api
      .get('/api/support')
      .then((res) => setTickets(res.tickets || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('attachment', file)
      const res = await api.post('/api/support/upload-attachment', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm((f) => ({ ...f, attachment: res.url }))
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const submitTicket = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const res = await api.post('/api/support', form)
      setSuccess(res.message)
      setForm(EMPTY_FORM)
      setView('list')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openThread = async (t) => {
    setError('')
    try {
      const res = await api.get(`/api/support/${t.id}`)
      setActive(res.ticket)
      setView('thread')
      setReply('')
    } catch (err) {
      setError(err.message)
    }
  }

  const sendReply = async (e) => {
    e.preventDefault()
    if (!reply.trim()) return
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post(`/api/support/${active.id}/reply`, { message: reply })
      setActive(res.ticket)
      setReply('')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="card">
      {view === 'list' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Support tickets</h3>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { setView('new'); setError(''); setSuccess('') }}>
              + New ticket
            </button>
          </div>
          {success && <p className="form-success">{success}</p>}
          {error && <p className="form-error">{error}</p>}

          {tickets.length === 0 ? (
            <p className="muted">
              No support tickets yet. If you have a problem with an order, payment or delivery, open a ticket and our
              team will help you.
            </p>
          ) : (
            <div className="ticket-list">
              {tickets.map((t) => (
                <button type="button" key={t.id} className="ticket-row" onClick={() => openThread(t)}>
                  <div className="ticket-row-main">
                    <strong>{t.subject}</strong>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {t.ticketNumber} • {STATUS_LABEL[t.status] || t.status} • {t.messages.length} message(s)
                    </span>
                  </div>
                  <span className={`status-pill small ${t.status === 'closed' || t.status === 'resolved' ? 'approved' : 'pending'}`}>
                    {STATUS_LABEL[t.status] || t.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'new' && (
        <>
          <h3>New support ticket</h3>
          <form onSubmit={submitTicket}>
            <label className="field">
              <span>Subject *</span>
              <input
                required
                maxLength={200}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. My order has not arrived"
              />
            </label>
            <div className="form-grid-2">
              <label className="field">
                <span>Category</span>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Order number (optional)</span>
                <input
                  value={form.orderNumber}
                  onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
                  placeholder="ORD-100001"
                />
              </label>
            </div>
            <label className="field">
              <span>Message *</span>
              <textarea
                required
                rows={5}
                maxLength={5000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe your issue in detail…"
              />
            </label>
            <label className="field">
              <span>Attachment (optional)</span>
              <input type="file" accept="image/*" onChange={onFile} disabled={uploading} />
              {uploading && <span className="muted"> Uploading…</span>}
              {form.attachment && <span className="form-success" style={{ display: 'inline-block', marginTop: 6 }}>✓ Attached</span>}
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setView('list')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
                {submitting ? 'Submitting…' : 'Submit ticket'}
              </button>
            </div>
          </form>
        </>
      )}

      {view === 'thread' && active && (
        <>
          <button type="button" className="text-link" onClick={() => setView('list')}>← Back to tickets</button>
          <h3 style={{ marginTop: 10 }}>{active.subject}</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            {active.ticketNumber} • {STATUS_LABEL[active.status] || active.status}
            {active.orderNumber ? ` • Order ${active.orderNumber}` : ''}
          </p>

          <div className="ticket-thread">
            {active.messages.map((m) => (
              <div key={m.id} className={`ticket-msg ${m.sender}`}>
                <div className="ticket-msg-bubble">
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                  {m.attachment && (
                    <a href={m.attachment} target="_blank" rel="noreferrer" className="ticket-attachment">
                      📎 View attachment
                    </a>
                  )}
                </div>
                <span className="ticket-msg-meta">
                  {m.senderName || (m.sender === 'admin' ? 'Support team' : 'You')} •{' '}
                  {new Date(m.at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {!['closed', 'resolved'].includes(active.status) && (
            <form onSubmit={sendReply} style={{ marginTop: 16 }}>
              <label className="field">
                <span>Your reply</span>
                <textarea
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply…"
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting || !reply.trim()}>
                  {submitting ? 'Sending…' : 'Send reply'}
                </button>
              </div>
            </form>
          )}
          {['closed', 'resolved'].includes(active.status) && (
            <p className="muted">This ticket is closed. Open a new ticket if you still need help.</p>
          )}
        </>
      )}
    </div>
  )
}
