import { useEffect, useState } from "react";
import api from "../api/axios";

const RANGES = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["month", "This month"],
  ["last_month", "Last month"],
];

function Chart({ data }) {
  // Simple SVG bar chart for daily revenue
  if (!data || data.length === 0) return <div className="empty-state">No data for this range.</div>;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const W = 640, H = 200, PAD = 4;
  const bw = Math.max(4, (W - PAD * 2) / data.length - 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 200 }}>
      {data.map((d, i) => {
        const h = (d.revenue / max) * (H - 30);
        return (
          <g key={d._id}>
            <rect
              x={PAD + i * ((W - PAD * 2) / data.length)}
              y={H - 20 - h}
              width={bw}
              height={Math.max(h, 1)}
              rx={2}
              fill="#6366f1"
            />
            <title>{`${d._id}: ${d.revenue.toLocaleString()} ETB (${d.orders} orders)`}</title>
          </g>
        );
      })}
      <line x1={0} y1={H - 20} x2={W} y2={H - 20} stroke="#e2e8f0" />
    </svg>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState("sales");
  const [range, setRange] = useState("30d");
  const [sales, setSales] = useState(null);
  const [products, setProducts] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    const q = `range=${range}`;
    const calls = [
      api.get(`/admin/reports/sales?${q}`).catch(() => null),
      tab === "products" ? api.get(`/admin/reports/products?${q}`).catch(() => null) : Promise.resolve(null),
      tab === "customers" ? api.get(`/admin/reports/customers?${q}`).catch(() => null) : Promise.resolve(null),
    ];
    Promise.all(calls)
      .then(([s, p, c]) => {
        if (s) setSales(s.data);
        if (p && p.data) setProducts(p.data);
        if (c && c.data) setCustomers(c.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, tab]);

  function exportCsv(kind) {
    window.open(`http://localhost:5001/api/admin/reports/${kind}?range=${range}&format=csv`, "_blank");
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-desc">Sales, product and customer performance</p>
        </div>
        <div className="header-actions">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="range-select">
            {RANGES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => exportCsv(tab)}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="tabs-row">
        {[["sales", "Sales"], ["products", "Products"], ["customers", "Customers"]].map(([k, l]) => (
          <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading"><span className="spinner" /></div>
      ) : (
        <>
          {tab === "sales" && sales && (
            <>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-body">
                    <span className="metric-value">{(sales.totals?.revenue || 0).toLocaleString()} ETB</span>
                    <span className="metric-label">Revenue</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-body">
                    <span className="metric-value">{sales.totals?.orders || 0}</span>
                    <span className="metric-label">Orders</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-body">
                    <span className="metric-value">{(sales.totals?.avgOrder || 0).toLocaleString()} ETB</span>
                    <span className="metric-label">Avg order value</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-body">
                    <span className="metric-value">{(sales.totals?.discounts || 0).toLocaleString()} ETB</span>
                    <span className="metric-label">Promo discounts</span>
                  </div>
                </div>
              </div>
              <div className="chart-card">
                <div className="chart-title">Daily revenue</div>
                <Chart data={sales.daily || []} />
              </div>
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr><th>Payment method</th><th>Orders</th><th>Revenue</th></tr>
                  </thead>
                  <tbody>
                    {(sales.byMethod || []).map((m) => (
                      <tr key={m._id}>
                        <td className="capitalize">{String(m._id || "—").replace(/_/g, " ")}</td>
                        <td>{m.orders}</td>
                        <td>{m.revenue?.toLocaleString()} ETB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "products" && products && (
            <>
              <div className="table-card">
                <div className="card-header"><span className="card-title">Best sellers (by revenue)</span></div>
                <table className="data-table">
                  <thead>
                    <tr><th>Product</th><th>SKU</th><th>Units sold</th><th>Revenue</th></tr>
                  </thead>
                  <tbody>
                    {(products.bestSellers || []).map((p, i) => (
                      <tr key={p._id || i}>
                        <td className="td-strong">{p.name}</td>
                        <td>{p.sku || "—"}</td>
                        <td>{p.unitsSold}</td>
                        <td>{p.revenue?.toLocaleString()} ETB</td>
                      </tr>
                    ))}
                    {(products.bestSellers || []).length === 0 && (
                      <tr><td colSpan={4} className="empty-row">No sales in this range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-card">
                <div className="card-header"><span className="card-title">Low / out of stock</span></div>
                <table className="data-table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Stock</th></tr></thead>
                  <tbody>
                    {[...(products.outOfStock || []), ...(products.lowStock || [])].map((p, i) => (
                      <tr key={i}>
                        <td>{p.name}</td>
                        <td>{p.sku}</td>
                        <td>
                          <span className={`stock-pill ${p.stock <= 0 ? "out" : "low"}`}>
                            {p.stock <= 0 ? "Out of stock" : `${p.stock} left`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "customers" && customers && (
            <>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-body">
                    <span className="metric-value">{customers.newCustomers}</span>
                    <span className="metric-label">New customers</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-body">
                    <span className="metric-value">{customers.totalCustomers}</span>
                    <span className="metric-label">Total customers</span>
                  </div>
                </div>
              </div>
              <div className="table-card">
                <div className="card-header"><span className="card-title">Top customers (by spending)</span></div>
                <table className="data-table">
                  <thead>
                    <tr><th>Customer</th><th>Email</th><th>Phone</th><th>Orders</th><th>Total spent</th></tr>
                  </thead>
                  <tbody>
                    {(customers.topCustomers || []).map((c, i) => (
                      <tr key={c.id || i}>
                        <td className="td-strong">{c.name || "—"}</td>
                        <td>{c.email || "—"}</td>
                        <td>{c.phone || "—"}</td>
                        <td>{c.orders}</td>
                        <td>{c.totalSpent?.toLocaleString()} ETB</td>
                      </tr>
                    ))}
                    {(customers.topCustomers || []).length === 0 && (
                      <tr><td colSpan={5} className="empty-row">No customer orders in this range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
