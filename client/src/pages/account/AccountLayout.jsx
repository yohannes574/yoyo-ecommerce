import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../../components/Icons'

export default function AccountLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="page container">
      <div className="account-container">
        {/* Sidebar Nav */}
        <aside className="account-sidebar">
          <div className="account-profile-summary">
            <div className="avatar-circle">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="profile-text">
              <strong className="profile-name">{user?.name}</strong>
              <span className="profile-email muted">{user?.email}</span>
            </div>
          </div>

          <nav className="account-nav">
            <NavLink to="/account" end className={({ isActive }) => `account-nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon"><Icon.Package size={19} /></span>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/account/orders" className={({ isActive }) => `account-nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon"><Icon.Cart size={19} /></span>
              <span>My Orders</span>
            </NavLink>
            <NavLink to="/account/addresses" className={({ isActive }) => `account-nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon"><Icon.MapPin size={19} /></span>
              <span>Saved Addresses</span>
            </NavLink>
            <NavLink to="/account/notifications" className={({ isActive }) => `account-nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon"><Icon.Bell size={19} /></span>
              <span>Notifications</span>
            </NavLink>
            <NavLink to="/account/support" className={({ isActive }) => `account-nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon"><Icon.Headset size={19} /></span>
              <span>Support</span>
            </NavLink>
            <NavLink to="/account/profile" className={({ isActive }) => `account-nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon"><Icon.User size={19} /></span>
              <span>Profile Settings</span>
            </NavLink>
            <button type="button" className="account-nav-link signout-btn" onClick={handleLogout}>
              <span className="nav-icon">🚪</span>
              <span>Sign Out</span>
            </button>
          </nav>
        </aside>

        {/* Account Main Content Area */}
        <main className="account-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
