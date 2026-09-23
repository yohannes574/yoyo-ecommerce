import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useWishlist } from '../../context/WishlistContext'
import api from '../../api'
import Spinner from '../../components/Spinner'
import { Icon } from '../../components/Icons'

export default function Dashboard() {
  const { user } = useAuth()
  const { ids: wishlistIds } = useWishlist()
  const [orders, setOrders] = useState([])
  const [addressCount, setAddressCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      api.get('/orders'),
      api.get('/addresses'),
    ]).then(([ordersRes, addrRes]) => {
      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.orders || [])
      }
      if (addrRes.status === 'fulfilled') {
        setAddressCount(addrRes.value.addresses?.length || 0)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="card text-center" style={{ padding: '60px 20px' }}>
        <Spinner />
        <p className="muted" style={{ marginTop: 12 }}>Loading account dashboard...</p>
      </div>
    )
  }

  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status?.toLowerCase())
  )

  const recentOrders = orders.slice(0, 3)

  return (
    <div className="account-dashboard">
      <div className="dashboard-welcome card">
        <div>
          <h2>Welcome back, {user?.name}!</h2>
          <p className="muted" style={{ margin: 0 }}>
            Here is what's happening with your account and recent purchases.
          </p>
        </div>
        <Link to="/shop" className="btn btn-primary btn-sm">
          Browse Shop
        </Link>
      </div>

      {/* KPI Stats Cards */}
      <div className="stats-grid" style={{ marginTop: 20 }}>
        <div className="card stat-card">
          <span className="stat-icon"><Icon.Package size={22} /></span>
          <div className="stat-content">
            <span className="stat-num">{orders.length}</span>
            <span className="stat-label muted">Total Orders</span>
          </div>
        </div>

        <div className="card stat-card">
          <span className="stat-icon"><Icon.Truck size={22} /></span>
          <div className="stat-content">
            <span className="stat-num">{activeOrders.length}</span>
            <span className="stat-label muted">In Progress</span>
          </div>
        </div>

        <div className="card stat-card">
          <span className="stat-icon"><Icon.MapPin size={22} /></span>
          <div className="stat-content">
            <span className="stat-num">{addressCount}</span>
            <span className="stat-label muted">Saved Addresses</span>
          </div>
        </div>

        <div className="card stat-card">
          <span className="stat-icon"><Icon.Heart size={22} /></span>
          <div className="stat-content">
            <span className="stat-num">{wishlistIds.size}</span>
            <span className="stat-label muted">Wishlist Items</span>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3>Recent Orders</h3>
          <Link to="/account/orders" className="text-link">
            View All ({orders.length}) <Icon.ArrowRight size={15} />
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <div className="dashboard-orders-list">
            {recentOrders.map((o) => (
              <div key={o.id} className="dashboard-order-item">
                <div className="order-main-info">
                  <strong>{o.orderNumber}</strong>
                  <span className="order-date muted">
                    {new Date(o.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="order-badges">
                  <span className={`status-pill status-${o.status}`}>
                    {o.orderStatusLabel || o.status}
                  </span>
                  <span className="order-total">{o.total?.toLocaleString()} ETB</span>
                </div>
                <Link to={`/account/orders/${o.id}`} className="btn btn-outline btn-sm">
                  Track Order
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center" style={{ padding: '32px 16px' }}>
            <p className="muted">You haven't placed any orders yet.</p>
            <Link to="/shop" className="btn btn-primary btn-sm">
              Start Shopping
            </Link>
          </div>
        )}
      </div>

      {/* Quick Action Shortcuts */}
      <div className="quick-actions-grid" style={{ marginTop: 24 }}>
        <Link to="/account/addresses" className="card shortcut-card">
          <span className="shortcut-icon"><Icon.MapPin size={20} /></span>
          <div>
            <strong>Manage Delivery Addresses</strong>
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>Add or update your home/office addresses.</p>
          </div>
        </Link>
        <Link to="/account/profile" className="card shortcut-card">
          <span className="shortcut-icon">⚙️</span>
          <div>
            <strong>Profile & Password Settings</strong>
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>Update phone number or reset your login password.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

