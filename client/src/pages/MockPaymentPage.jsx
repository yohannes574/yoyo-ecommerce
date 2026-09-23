import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

/**
 * Mock payment gateway page (Phase 7, mock mode).
 * Simulates what a hosted checkout (Chapa-style) does: shows amount + reference
 * and a Pay button. In live mode customers never see this page — they are sent
 * straight to the aggregator's hosted checkout.
 */
export default function MockPaymentPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const reference = params.get('reference') || ''
  const amount = params.get('amount') || ''
  const orderParam = params.get('order') || ''
  const [status, setStatus] = useState('idle') // idle | paying | done | error
  const [error, setError] = useState('')

  const pay = async () => {
    setStatus('paying')
    setError('')
    try {
      // In mock mode the server flips a MOCK- reference straight to paid.
      const mockRef = reference.replace('YOYO-', 'MOCK-')
      await api.get(`/payments/verify/${encodeURIComponent(mockRef)}`)
      setStatus('done')
    } catch (e) {
      setError(e.message || 'Payment failed')
      setStatus('error')
    }
  }

  if (!user) {
    return (
      <div className="page container narrow">
        <div className="card text-center" style={{ padding: 40 }}>
          <h2>Sign in required</h2>
          <p className="muted">Please log in to complete your payment.</p>
          <Link to="/login" className="btn btn-primary">Log in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page container narrow">
      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span className="badge badge-info">Sandbox / Mock gateway</span>
        </div>
        <h2 style={{ marginBottom: 4 }}>Mobile money checkout</h2>
        <p className="muted" style={{ fontSize: 14 }}>
          This page simulates the payment provider's hosted checkout (Telebirr / CBE Birr / M-Pesa via
          aggregator). With live gateway credentials configured on the server, customers are redirected to the
          real provider instead.
        </p>

        <div className="refund-preview" style={{ margin: '18px 0' }}>
          <span>Order {orderParam}</span>
          <strong>{Number(amount).toLocaleString()} ETB</strong>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>Reference: <code>{reference}</code></p>

        {status === 'done' ? (
          <div>
            <p className="form-success">✓ Payment successful! Your order has been confirmed.</p>
            <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={() => navigate('/account/orders')}>
                View my orders
              </button>
            </div>
          </div>
        ) : (
          <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/account/orders')} disabled={status === 'paying'}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={pay} disabled={status === 'paying'}>
              {status === 'paying' ? 'Processing…' : `Pay ${Number(amount).toLocaleString()} ETB`}
            </button>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
      </div>
    </div>
  )
}

