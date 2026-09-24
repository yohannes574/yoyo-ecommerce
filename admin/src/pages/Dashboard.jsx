import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import api from "../api/axios";
import { getImageUrl } from "../utils/imageUrl";

const STATUS_COLOR = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#8b5cf6",
  ready_for_delivery: "#06b6d4",
  out_for_delivery: "#f97316",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

function MetricCard({ icon, label, value, sub, accent }) {
  return (
    <div className="metric-card" style={{ "--accent-color": accent }}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-body">
        <span className="metric-value">{value}</span>
        <span className="metric-label">{label}</span>
        {sub && <span className="metric-sub">{sub}</span>}
      </div>
      <div className="metric-glow" />
    </div>
  );
}

function StatusBadge({ status }) {
  const label = status?.replace(/_/g, " ") || "unknown";

  return (
    <span
      className="status-badge"
      style={{
        "--badge-color": STATUS_COLOR[status] || "#6b7280",
      }}
    >
      {label}
    </span>
  );
}

function formatETB(n) {
  return `${(n || 0).toLocaleString("en-ET")} ETB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-ET", {
    month: "short",
    day: "numeric",
  });
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/admin/dashboard/metrics")
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="page-loading">
        <span className="spinner" />
        <p>Loading dashboard…</p>
      </div>
    );

  if (error) return <div className="page-error">{error}</div>;

  const {
    metrics,
    salesTimeline = [],
    lowStockProducts = [],
    recentOrders = [],
  } = data;

  const chartData = salesTimeline.map((d) => ({
    ...d,
    day: new Date(d.date + "T00:00:00").toLocaleDateString("en-ET", {
      weekday: "short",
    }),
  }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-desc">
            Welcome back — here's what's happening today.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="metrics-grid">
        <MetricCard
          icon="💰"
          label="Total Revenue"
          value={formatETB(metrics.totalRevenue)}
          accent="#6366f1"
        />

        <MetricCard
          icon="📦"
          label="Total Orders"
          value={metrics.totalOrders.toLocaleString()}
          sub={`${metrics.statusCounts.pending} pending`}
          accent="#10b981"
        />

        <MetricCard
          icon="👥"
          label="Customers"
          value={metrics.totalCustomers.toLocaleString()}
          accent="#f59e0b"
        />

        <MetricCard
          icon="⚠️"
          label="Low Stock"
          value={metrics.lowStockCount}
          sub={`${metrics.outOfStockCount} out of stock`}
          accent="#ef4444"
        />

        <MetricCard
          icon="🏦"
          label="Pending Receipts"
          value={metrics.pendingReceipts}
          sub="Awaiting verification"
          accent="#8b5cf6"
        />
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h2 className="chart-title">Revenue — Last 7 Days</h2>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="revGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#6366f1"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="#6366f1"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
              />

              <XAxis dataKey="day" />

              <YAxis />

              <Tooltip
                formatter={(v) => [
                  `${v.toLocaleString()} ETB`,
                  "Revenue",
                ]}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                fill="url(#revGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Orders — Last 7 Days</h2>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
              />

              <XAxis dataKey="day" />

              <YAxis />

              <Tooltip
                formatter={(v) => [v, "Orders"]}
              />

              <Bar
                dataKey="orders"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-bottom">
        <div className="table-card">
          <div className="card-header">
            <h2 className="card-title">Recent Orders</h2>

            <button
              className="btn-link"
              onClick={() => navigate("/orders")}
            >
              View all →
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {recentOrders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/orders/${o.id}`)}
                  className="clickable-row"
                >
                  <td>
                    <strong>{o.orderNumber}</strong>
                  </td>

                  <td>{o.customerName}</td>

                  <td>{formatETB(o.total)}</td>

                  <td>
                    {o.paymentMethod?.replace(/_/g, " ")}
                  </td>

                  <td>
                    <StatusBadge status={o.orderStatus} />
                  </td>

                  <td>{formatDate(o.createdAt)}</td>
                </tr>
              ))}

              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-card low-stock-card">
          <div className="card-header">
            <h2 className="card-title">
              ⚠️ Low Stock Alert
            </h2>

            <button
              className="btn-link"
              onClick={() => navigate("/inventory")}
            >
              Manage →
            </button>
          </div>

          <div className="low-stock-list">
            {lowStockProducts.map((p) => (
              <div
                key={p.id}
                className={`low-stock-item ${
                  p.isOutOfStock ? "out-of-stock" : ""
                }`}
                onClick={() => navigate("/inventory")}
              >
                <div className="stock-product-info">
                  {p.image ? (
                    <img
                      src={getImageUrl(p.image)}
                      alt={p.name}
                      className="stock-thumb"
                    />
                  ) : (
                    <div className="stock-thumb-placeholder">
                      📦
                    </div>
                  )}

                  <div>
                    <p className="stock-name">{p.name}</p>
                    <p className="stock-sku">
                      SKU: {p.sku}
                    </p>
                  </div>
                </div>

                <div className="stock-numbers">
                  <span
                    className={`stock-count ${
                      p.isOutOfStock ? "zero" : "low"
                    }`}
                  >
                    {p.stock} left
                  </span>

                  <span className="stock-threshold">
                    / {p.lowStockThreshold}
                  </span>
                </div>
              </div>
            ))}

            {lowStockProducts.length === 0 && (
              <p className="empty-state">
                ✅ All products are well stocked
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}