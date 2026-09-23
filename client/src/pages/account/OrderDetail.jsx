import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api'
import Spinner from '../../components/Spinner'
import ReturnRequestModal from '../../components/ReturnRequestModal'
import { Icon } from '../../components/Icons'

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: null },
  { key: 'confirmed', label: 'Payment / Confirmed', icon: null },
  { key: 'processing', label: 'Processing at Warehouse', icon: Icon.Package },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Icon.Truck },
  { key: 'delivered', label: 'Delivered', icon: Icon.Check },
]

export default function OrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const orderRef = useRef(null)

  // Cancel Order State
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  // Return Request State
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnInfo, setReturnInfo] = useState(null)
  const [returnSuccess, setReturnSuccess] = useState('')

  const fetchOrder = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/checkouts/${id}`)
      setOrder(res.order)
      orderRef.current = res.order?.orderNumber || null
    } catch (err) {
      setError(err.message || 'Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const loadReturnInfo = () => {
    api
      .get('/returns')
      .then((res) => {
        const match = (res.returns || []).find((r) => r.orderNumber === orderRef.current)
        setReturnInfo(match || null)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (id) {
      fetchOrder().then(loadReturnInfo)
    }
  }, [id])

  const handleCancelOrder = async (e) => {
    e.preventDefault()
    setCancelError('')
    setCancelling(true)
    try {
      const res = await api.post(`/checkouts/${id}/cancel`, { cancelReason })
      setOrder(res.order)
      setShowCancelModal(false)
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="card text-center" style={{ padding: '60px 20px' }}>
        <Spinner />
        <p className="muted" style={{ marginTop: 12 }}>Loading order tracking information...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="card text-center" style={{ padding: '40px 20px' }}>
        <h2>Order Not Found</h2>
        <p className="danger">{error || 'Could not find the requested order.'}</p>
        <Link to="/account/orders" className="btn btn-primary" style={{ marginTop: 16 }}>
          Back to Orders
        </Link>
      </div>
    )
  }

  const isCancelled = order.status === 'cancelled'

  // Map to the 5 visual steps
  const getStepProgressIndex = (status) => {
    if (status === 'pending') return 0
    if (status === 'confirmed') return 1
    if (status === 'processing' || status === 'ready_for_delivery') return 2
    if (status === 'out_for_delivery') return 3
    if (status === 'delivered') return 4
    return -1
  }

  const progressIndex = getStepProgressIndex(order.status)

  return (
    <div className="order-detail-view">
      <div className="detail-top-nav">
        <Link to="/account/orders" className="text-link">
          ← Back to all orders
        </Link>
      </div>

      {/* Header Bar */}
      <div className="card order-header-card" style={{ marginTop: 12 }}>
        <div className="header-meta">
          <div>
            <h1>Order {order.orderNumber}</h1>
            <p className="muted" style={{ margin: 0 }}>
              Placed on {new Date(order.createdAt).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="header-badges">
            <span className={`status-pill status-${order.status}`}>
              {order.orderStatusLabel || order.status}
            </span>
            {order.canCancel && !isCancelled && (
              <button
                type="button"
                className="btn btn-outline btn-sm text-link danger"
                onClick={() => setShowCancelModal(true)}
              >
                Cancel Order
              </button>
            )}
            {order.canReturn && !returnInfo && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowReturnModal(true)}
              >
                ↩ Request Return
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancelled Notice */}
      {isCancelled && (
        <div className="payment-alert-box danger" style={{ marginTop: 16 }}>
          <strong>This order was cancelled</strong>
          {order.cancelReason && <p style={{ margin: '4px 0 0', fontSize: 13.5 }}>Reason: {order.cancelReason}</p>}
        </div>
      )}

      {returnSuccess && <p className="form-success">{returnSuccess}</p>}

      {/* Return request status */}
      {returnInfo && (
        <div className="payment-alert-box info" style={{ marginTop: 16 }}>
          <strong>↩ Return {returnInfo.returnNumber} — {returnInfo.status}</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13.5 }}>
            {returnInfo.status === 'requested' && 'Your return request is awaiting review.'}
            {returnInfo.status === 'approved' && 'Your return was approved. Please prepare the items for handover.'}
            {returnInfo.status === 'received' && 'We received your returned items. Refund processing.'}
            {returnInfo.status === 'refunded' && `Refund of ${returnInfo.refundAmount?.toLocaleString()} ETB processed.`}
            {(returnInfo.status === 'rejected' || returnInfo.status === 'cancelled') && 'This return request was closed.'}
          </p>
        </div>
      )}

      {/* Graphical Order Tracking Timeline */}
      {!isCancelled && (
        <div className="card tracking-timeline-card" style={{ marginTop: 16 }}>
          <h3>Order Progress Tracker</h3>
          <div className="progress-track-bar">
            {TIMELINE_STEPS.map((s, idx) => {
              const isDone = progressIndex >= idx
              const isCurrent = progressIndex === idx
              return (
                <div
                  key={s.key}
                  className={`track-step ${isDone ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                >
                  <div className="track-step-circle">
                    {isDone && !isCurrent ? <Icon.Check size={15} /> : s.icon ? <s.icon size={16} /> : idx + 1}
                  </div>
                  <span className="track-step-label">{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="detail-layout-grid" style={{ marginTop: 16 }}>
        {/* Left Column: Items & Timeline Audit */}
        <div className="detail-main">
          {/* Items card */}
          <div className="card">
            <h3>Items in this Order ({order.items?.length || 0})</h3>
            <div className="order-items-table" style={{ marginTop: 12 }}>
              {order.items?.map((item, idx) => (
                <div key={idx} className="order-item-detail-row">
                  <img
                    src={item.image || '/placeholder.png'}
                    alt={item.name}
                    className="item-detail-img"
                  />
                  <div className="item-detail-meta">
                    <strong>{item.name}</strong>
                    {item.variantName && <span className="variant-tag">{item.variantName}</span>}
                    <span className="muted" style={{ fontSize: 13 }}>
                      {item.price?.toLocaleString()} ETB × {item.qty}
                    </span>
                  </div>
                  <div className="item-detail-price">
                    {item.subtotal?.toLocaleString()} ETB
                  </div>
                </div>
              ))}
            </div>

            {/* Total breakdown */}
            <div className="order-pricing-summary">
              <div className="price-line">
                <span>Items Subtotal</span>
                <span>{order.subtotal?.toLocaleString()} ETB</span>
              </div>
              {order.discount > 0 && (
                <div className="price-line discount">
                  <span>Promo Discount ({order.promoCode || 'PROMO'})</span>
                  <span>-{order.discount?.toLocaleString()} ETB</span>
                </div>
              )}
              <div className="price-line">
                <span>Delivery Fee ({order.deliveryMethod || 'Standard'})</span>
                <span>{order.deliveryFee?.toLocaleString()} ETB</span>
              </div>
              <hr />
              <div className="price-line total">
                <strong>Grand Total</strong>
                <strong className="grand-total-amount">{order.total?.toLocaleString()} ETB</strong>
              </div>
            </div>
          </div>

          {/* Detailed Timeline Events History */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Status Activity Log</h3>
            <div className="activity-timeline-list" style={{ marginTop: 12 }}>
              {order.timeline?.map((evt, idx) => (
                <div key={idx} className="activity-timeline-item">
                  <div className="activity-bullet"></div>
                  <div className="activity-content">
                    <strong>{evt.note || evt.status}</strong>
                    <span className="activity-meta muted">
                      {new Date(evt.at).toLocaleString()} • Updated by {evt.by || 'System'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Address & Payment Details */}
        <div className="detail-sidebar">
          {/* Shipping Address */}
          <div className="card">
            <h4><Icon.MapPin size={16} /> Shipping Address</h4>
            <p style={{ margin: '8px 0 0', fontWeight: 600 }}>{order.address?.fullName}</p>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: 14 }}>
              <Icon.Phone size={14} /> {order.address?.phone}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 14 }}>
              {order.address?.address}<br />
              {order.address?.subCity ? `${order.address.subCity}, ` : ''}{order.address?.city}, {order.address?.region}
            </p>
            {order.address?.deliveryInstructions && (
              <p className="instructions-box" style={{ marginTop: 10, fontSize: 13 }}>
                Note: {order.address.deliveryInstructions}
              </p>
            )}
          </div>

          {/* Payment Details */}
          <div className="card" style={{ marginTop: 16 }}>
            <h4>💳 Payment Details</h4>
            <div style={{ marginTop: 8 }}>
              <div className="meta-pair">
                <span className="muted">Method:</span>
                <strong>
                  {order.payment?.method === 'cash_on_delivery' ? 'Cash on Delivery' : 'Bank Transfer'}
                </strong>
              </div>
              <div className="meta-pair">
                <span className="muted">Payment Status:</span>
                <span className="badge">{order.payment?.paymentStatusLabel || order.payment?.status}</span>
              </div>
              {order.payment?.bank && (
                <div className="meta-pair">
                  <span className="muted">Bank:</span>
                  <span>{order.payment.bank}</span>
                </div>
              )}
              {order.payment?.verifiedAt && (
                <div className="meta-pair">
                  <span className="muted">Verified On:</span>
                  <span>{new Date(order.payment.verifiedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Receipt Preview if Bank Transfer */}
            {order.payment?.receiptUrl && (
              <div className="receipt-view-card" style={{ marginTop: 16 }}>
                <span className="muted" style={{ fontSize: 13 }}>Uploaded Payment Receipt:</span>
                <a
                  href={order.payment.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="receipt-img-link"
                >
                  <img
                    src={order.payment.receiptUrl}
                    alt="Receipt Screenshot"
                    className="attached-receipt-img"
                  />
                  <span className="view-full-badge">🔍 Click to zoom receipt</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Return Request Modal */}
      {showReturnModal && (
        <ReturnRequestModal
          order={order}
          onClose={() => setShowReturnModal(false)}
          onRequested={(ret) => {
            setShowReturnModal(false)
            setReturnSuccess(ret.returnNumber ? `Return ${ret.returnNumber} submitted.` : 'Return request submitted.')
            loadReturnInfo()
          }}
        />
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="modal-backdrop">
          <div className="modal-card card">
            <h3>Cancel Order {order.orderNumber}?</h3>
            <p className="muted" style={{ fontSize: 14 }}>
              Are you sure you want to cancel this order? Any reserved inventory will be immediately released.
            </p>

            <form onSubmit={handleCancelOrder} style={{ marginTop: 16 }}>
              <label className="field">
                <span>Reason for cancellation (optional):</span>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Changed my mind / Found another product"
                />
              </label>

              {cancelError && <p className="form-error-text">{cancelError}</p>}

              <div className="btn-row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={cancelling}
                  onClick={() => setShowCancelModal(false)}
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  className="btn btn-dark"
                  style={{ background: 'var(--red)' }}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


