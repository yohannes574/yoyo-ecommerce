import { useState, useEffect } from 'react'
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom'
import api from '../api'
import { Icon } from '../components/Icons'
import Spinner from '../components/Spinner'

export default function OrderConfirmation() {
  const { id } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [order, setOrder] = useState(location.state?.order || null)
  const [loading, setLoading] = useState(!order)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id || !order || order.payment?.method !== 'mobile') return

    const returnedReference =
      searchParams.get('tx_ref') ||
      searchParams.get('trx_ref') ||
      searchParams.get('reference') ||
      order.payment?.gatewayReference
    if (!returnedReference || order.payment?.status === 'paid') return

    api
      .get(`/payments/verify/${encodeURIComponent(returnedReference)}`)
      .then(() => api.get(`/checkouts/${id}`))
      .then((res) => setOrder(res.order))
      .catch((err) => setError(err.message || 'Payment verification is still pending'))
  }, [id, order, searchParams])

  useEffect(() => {
    if (!order && id) {
      api
        .get(`/checkouts/${id}`)
        .then((res) => setOrder(res.order))
        .catch((err) => setError(err.message || 'Order could not be loaded'))
        .finally(() => setLoading(false))
    }
  }, [id, order])

  if (loading) {
    return (
      <div className="page container narrow text-center" style={{ padding: '80px 20px' }}>
        <Spinner />
        <p className="muted" style={{ marginTop: 16 }}>Loading order confirmation details...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="page container narrow" style={{ padding: '60px 20px' }}>
        <div className="card text-center" style={{ padding: '40px 20px' }}>
          <h2>Order Details Unavailable</h2>
          <p className="danger">{error || 'Could not find the requested order.'}</p>
          <div style={{ marginTop: 20 }}>
            <Link to="/account/orders" className="btn btn-primary">
              View My Orders
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isBankTransfer = order.payment?.method === 'bank_transfer'

  return (
    <div className="page container narrow">
      <div className="order-confirmation-card card">
        <div className="confirmation-header text-center">
          <div className="success-icon-badge"><Icon.Check size={30} /></div>
          <h1>Thank You for Your Order!</h1>
          <p className="order-num-text">
            Order Reference: <strong>{order.orderNumber}</strong>
          </p>
          <p className="muted" style={{ fontSize: 14 }}>
            A confirmation has been recorded. You can track fulfillment status in real-time.
          </p>
        </div>

        {/* Payment Notice Box */}
        {isBankTransfer ? (
          <div className="payment-alert-box info">
            <strong>🏦 Bank Transfer Verification</strong>
            <p style={{ margin: '6px 0 0', fontSize: 14 }}>
              Your deposit receipt has been received. Our finance team is reviewing it. Once verified, your status will update to <strong>Confirmed</strong>.
            </p>
          </div>
        ) : (
          <div className="payment-alert-box success">
            <strong>💵 Cash on Delivery (COD) Confirmed</strong>
            <p style={{ margin: '6px 0 0', fontSize: 14 }}>
              Please have <strong>{order.total?.toLocaleString()} ETB</strong> ready in cash when the delivery courier arrives.
            </p>
          </div>
        )}

        {/* Order Snapshot Grid */}
        <div className="order-summary-box" style={{ marginTop: 24 }}>
          <h3>Order Details</h3>
          <div className="order-items-list">
            {order.items?.map((item, idx) => (
              <div key={idx} className="order-item-row">
                <div className="item-name-variant">
                  <strong>{item.name}</strong>
                  {item.variantName && <span className="variant-tag">{item.variantName}</span>}
                  <span className="qty-tag">Qty: {item.qty}</span>
                </div>
                <div className="item-subtotal">
                  {item.subtotal?.toLocaleString()} ETB
                </div>
              </div>
            ))}
          </div>

          <div className="order-totals-breakdown">
            <div className="breakdown-row">
              <span>Items Subtotal:</span>
              <span>{order.subtotal?.toLocaleString()} ETB</span>
            </div>
            {order.discount > 0 && (
              <div className="breakdown-row discount">
                <span>Promo Discount:</span>
                <span>-{order.discount?.toLocaleString()} ETB</span>
              </div>
            )}
            <div className="breakdown-row">
              <span>Delivery Fee:</span>
              <span>{order.deliveryFee?.toLocaleString()} ETB</span>
            </div>
            <hr />
            <div className="breakdown-row total">
              <strong>Grand Total:</strong>
              <strong className="total-highlight">{order.total?.toLocaleString()} ETB</strong>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="delivery-destination-box" style={{ marginTop: 20 }}>
          <h4>Delivery Address</h4>
          <p style={{ margin: 0 }}>
            <strong>{order.address?.fullName}</strong> ({order.address?.phone})<br />
            {order.address?.address}, {order.address?.subCity ? `${order.address.subCity}, ` : ''}{order.address?.city}, {order.address?.region}
          </p>
          {order.address?.deliveryInstructions && (
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 13.5 }}>
              Instructions: {order.address.deliveryInstructions}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="btn-row confirmation-actions" style={{ marginTop: 32, justifyContent: 'center' }}>
          <Link to={`/account/orders/${order.id}`} className="btn btn-primary">
            <Icon.Truck size={17} /> Track Order Live
          </Link>
          <Link to="/account/orders" className="btn btn-outline">
            View All My Orders
          </Link>
          <Link to="/shop" className="btn btn-ghost">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

