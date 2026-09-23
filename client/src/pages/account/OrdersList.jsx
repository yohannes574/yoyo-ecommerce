import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import Spinner from '../../components/Spinner'
import { Icon } from '../../components/Icons'

const STATUS_TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function OrdersList() {
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOrders = async (tab) => {
    setLoading(true)
    setError('')
    try {
      const url = tab === 'all' ? '/orders' : `/orders?status=${tab}`
      const res = await api.get(url)
      setOrders(res.orders || [])
    } catch (err) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(activeTab)
  }, [activeTab])

  return (
    <div className="account-orders-page">
      <div className="section-head">
        <h2>My Orders</h2>
        <p className="muted">Track fulfillment progress, view receipts, and review past purchases.</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs-bar">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`filter-tab-pill ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="form-error" style={{ margin: '16px 0' }}>{error}</div>}

      {loading ? (
        <div className="card text-center" style={{ padding: '60px 20px', marginTop: 16 }}>
          <Spinner />
          <p className="muted" style={{ marginTop: 12 }}>Loading your orders...</p>
        </div>
      ) : orders.length > 0 ? (
        <div className="orders-cards-list" style={{ marginTop: 20 }}>
          {orders.map((order) => (
            <div key={order.id} className="card order-card">
              <div className="order-card-head">
                <div className="head-left">
                  <span className="order-number-title">Order <strong>{order.orderNumber}</strong></span>
                  <span className="order-date-text muted">
                    Placed on {new Date(order.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="head-right">
                  <span className={`status-pill status-${order.status}`}>
                    {order.orderStatusLabel || order.status}
                  </span>
                  <span className="payment-status-pill">
                    {order.payment?.paymentStatusLabel || order.payment?.status}
                  </span>
                </div>
              </div>

              <div className="order-card-body">
                <div className="order-details-meta">
                  <span className="items-count-badge"><Icon.Package size={13} /> {order.itemsCount || 1} Item(s)</span>
                  <span className="total-amount-text">
                    Total: <strong>{order.total?.toLocaleString()} ETB</strong>
                  </span>
                </div>
                <div className="order-actions">
                  <Link to={`/account/orders/${order.id}`} className="btn btn-primary btn-sm">
                    View Details & Track →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center" style={{ padding: '48px 20px', marginTop: 20 }}>
          <Icon.Package size={40} />
          <h3 style={{ marginTop: 12 }}>No orders found</h3>
          <p className="muted">
            {activeTab === 'all'
              ? "You haven't placed any orders with Yoyo yet."
              : `You have no orders currently in '${STATUS_TABS.find((t) => t.key === activeTab)?.label}' status.`}
          </p>
          <div style={{ marginTop: 16 }}>
            <Link to="/shop" className="btn btn-primary">
              Start Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}


