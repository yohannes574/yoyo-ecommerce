import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TopBar from "./TopBar";

const NAV_ITEMS = [
  { to: "/dashboard", icon: "📊", label: "Dashboard" },
  { to: "/orders", icon: "📦", label: "Orders" },
  { to: "/products", icon: "🛍️", label: "Products" },
  { to: "/categories", icon: "📂", label: "Categories" },
  { to: "/inventory", icon: "🏭", label: "Inventory" },
  { to: "/delivery", icon: "🚚", label: "Delivery" },
  { to: "/customers", icon: "👥", label: "Customers" },
  { to: "/promos", icon: "🎟️", label: "Promotions" },
  { to: "/reports", icon: "📈", label: "Reports" },
  { to: "/reviews", icon: "⭐", label: "Reviews" },
  { to: "/returns", icon: "↩️", label: "Returns" },
  { to: "/support", icon: "💬", label: "Support" },
  { to: "/staff", icon: "🧑‍💼", label: "Staff" },
  { to: "/content", icon: "🖼️", label: "Content" },
  { to: "/settings", icon: "⚙️", label: "Settings" },
];

export default function AdminLayout() {
  const { adminUser, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">Y</span>
          <span className="logo-text">Yoyo Admin</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile">
            <div className="admin-avatar">
              {adminUser?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="admin-info">
              <span className="admin-name">{adminUser?.name || "Admin"}</span>
              <span className="admin-role">{adminUser?.role || "admin"}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-wrapper">
        <TopBar />
        <Outlet />
      </div>
    </div>
  );
}
