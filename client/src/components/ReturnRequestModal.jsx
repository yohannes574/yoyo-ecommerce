import { useEffect, useState } from 'react'
import api from '../api'

const REASONS = [
  'Damaged / defective item',
  'Wrong item delivered',
  'Item not as described',
  'Changed my mind',
  'Arrived too late',
  'Other',
]

export default function ReturnRequestModal({ order, onClose, onRequested }) {
  const [items, setItems] = useState([])
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [description, setDescription] = useState('')
  const [refundMethod, setRefundMethod] = useState('bank_transfer')
  const [refundAccount, setRefundAccount] = useState('')
  const [evidence, setEvidence] = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setItems((order.items || []).map((it) => ({ ...it, selected: true, returnQty: it.qty })))
  }, [order])

  const toggleItem = (idx) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it)))
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('evidence', file)
      const res = await api.post('/returns/upload-evidence', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setEvidence((prev) => [...prev, res.url])
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const refundTotal = items
    .filter((it) => it.selected)
    .reduce((s, it) => s + Math.round((it.price || 0) * (it.returnQty || 1)), 0)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const finalReason = reason === 'Other' ? customReason.trim() : reason
    if (!finalReason) {
      setError('Please choose or write a reason.')
      return
    }
    const selected = items.filter((it) => it.selected)
    if (selected.length === 0) {
      setError('Select at least one item to return.')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/returns', {
        orderId: order.id,
        items: selected.map((it) => ({
          productId: it.productId || it.product,
          variantName: it.variantName || '',
          qty: Math.max(1, Math.min(it.returnQty || 1, it.qty)),
          name: it.name,
        })),
        reason: finalReason,
        description,
        evidence,
        refundMethod,
        refundAccount,
      })
      onRequested(res.return || res)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card card return-modal">
        <h3>Request a return — Order {order.orderNumber}</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          Choose the items you want to return and tell us why. Our team will review your request.
        </p>

        <form onSubmit={submit}>
          <div className="return-items">
            {items.map((it, idx) => (
              <label key={idx} className={`return-item-row ${it.selected ? 'selected' : ''}`}>
                <input type="checkbox" checked={it.selected} onChange={() => toggleItem(idx)} />
                <img src={it.image || '/placeholder.png'} alt="" className="item-detail-img" />
                <span className="return-item-name">
                  {it.name}
                  {it.variantName && <span className="variant-tag"> {it.variantName}</span>}
                </span>
                <span className="return-item-qty">
                  × <input
                    type="number"
                    min={1}
                    max={it.qty}
                    value={it.returnQty}
                    disabled={!it.selected}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, returnQty: Math.max(1, Math.min(Number(e.target.value) || 1, p.qty)) } : p
                        )
                      )
                    }
                  />
                </span>
              </label>
            ))}
          </div>

          <label className="field">
            <span>Reason *</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} required>
              <option value="" disabled>Select a reason…</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          {reason === 'Other' && (
            <label className="field">
              <span>Please describe *</span>
              <input value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Tell us what happened" />
            </label>
          )}

          <label className="field">
            <span>Additional details (optional)</span>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="form-grid-2">
            <label className="field">
              <span>Refund method</span>
              <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                <option value="bank_transfer">Bank transfer</option>
                <option value="mobile">Mobile money (Telebirr etc.)</option>
                <option value="store_credit">Store credit</option>
              </select>
            </label>
            {refundMethod !== 'store_credit' && (
              <label className="field">
                <span>{refundMethod === 'mobile' ? 'Phone / mobile account' : 'Bank account (CBE etc.)'}</span>
                <input value={refundAccount} onChange={(e) => setRefundAccount(e.target.value)} placeholder="Account number or phone" />
              </label>
            )}
          </div>

          <label className="field">
            <span>Evidence photos (optional)</span>
            <input type="file" accept="image/*" onChange={onFile} disabled={uploading} />
            {uploading && <span className="muted"> Uploading…</span>}
            {evidence.length > 0 && (
              <div className="evidence-thumbs">
                {evidence.map((url, i) => (
                  <span key={i} className="evidence-thumb">
                    <img src={url} alt={`evidence ${i + 1}`} />
                    <button type="button" onClick={() => setEvidence((prev) => prev.filter((_, j) => j !== i))}>×</button>
                  </span>
                ))}
              </div>
            )}
          </label>

          <div className="refund-preview">
            <span>Estimated refund</span>
            <strong>{refundTotal.toLocaleString()} ETB</strong>
          </div>

          {error && <p className="form-error-text">{error}</p>}

          <div className="btn-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-dark" disabled={submitting || uploading}>
              {submitting ? 'Submitting…' : 'Submit return request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

