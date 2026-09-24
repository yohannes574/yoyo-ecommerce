import { useEffect, useState } from "react";
import api from "../api/axios";
import { getImageUrl } from "../utils/imageUrl";

const SECTION_LABELS = {
  showCategories: "Categories section",
  showNewArrivals: "New Arrivals",
  showBestSellers: "Best Sellers",
  showFeatured: "Featured Products",
  showOffers: "Special Offers",
};

export default function ContentPage() {
  const [homepage, setHomepage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", subtitle: "", link: "/shop", cta: "Shop now" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api
      .get("/admin/content")
      .then((r) => setHomepage(r.data.homepage))
      .catch(() => setError("Failed to load homepage content (content permission required)."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function flash(m) {
    setSuccess(m);
    setTimeout(() => setSuccess(""), 2500);
  }

  async function addBanner(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const fileInput = document.getElementById("banner-image-input");
      if (fileInput?.files?.[0]) fd.append("image", fileInput.files[0]);
      const r = await api.post("/admin/content/banners", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setHomepage((h) => ({ ...h, banners: r.data.banners }));
      setForm({ title: "", subtitle: "", link: "/shop", cta: "Shop now" });
      if (fileInput) fileInput.value = "";
      flash("Banner added.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add banner.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBanner(b) {
    try {
      const r = await api.put(`/admin/content/banners/${b.id}`, { active: !b.active });
      setHomepage((h) => ({ ...h, banners: r.data.banners }));
    } catch { /* ignore */ }
  }

  async function moveBanner(b, dir) {
    try {
      const r = await api.put(`/admin/content/banners/${b.id}`, { order: Math.max(0, (b.order || 0) + dir) });
      setHomepage((h) => ({ ...h, banners: r.data.banners }));
      load();
    } catch { /* ignore */ }
  }

  async function deleteBanner(b) {
    if (!window.confirm(`Delete banner "${b.title}"?`)) return;
    try {
      const r = await api.delete(`/admin/content/banners/${b.id}`);
      setHomepage((h) => ({ ...h, banners: r.data.banners }));
      flash("Banner deleted.");
    } catch { /* ignore */ }
  }

  async function toggleSection(key) {
    try {
      const r = await api.put("/admin/content/sections", { [key]: !homepage.sections[key] });
      setHomepage((h) => ({ ...h, sections: r.data.sections }));
    } catch { /* ignore */ }
  }

  if (loading) return <div className="page"><div className="page-loading"><span className="spinner" /></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Homepage Content</h1>
          <p className="page-desc">Hero banners and homepage sections shown on the storefront</p>
        </div>
      </div>

      {error && <div className="alert-error">{error} <button onClick={() => setError("")}>×</button></div>}
      {success && <div className="alert-success">{success} <button onClick={() => setSuccess("")}>×</button></div>}

      {/* Banners */}
      <div className="detail-card settings-cards">
        <span className="card-title">Hero Banners</span>

        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>Preview</th><th>Title</th><th>Subtitle</th><th>Link</th><th>Order</th><th>Status</th><th className="th-actions">Actions</th></tr>
            </thead>
            <tbody>
              {(homepage?.banners || []).map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.image ? (
                      <img
                        src={getImageUrl(b.image)}
                        alt=""
                        style={{
                          width: 72,
                          height: 40,
                          objectFit: "cover",
                          borderRadius: 6
                        }}
                      />
                    ) : (
                      <div style={{ width: 72, height: 40, background: "#f1f5f9", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#94a3b8" }}>no img</div>
                    )}
                  </td>
                  <td className="td-strong">{b.title}</td>
                  <td className="td-comment"><span className="clamp-2">{b.subtitle || "—"}</span></td>
                  <td>{b.link}</td>
                  <td>
                    <button className="icon-btn" title="Move up" onClick={() => moveBanner(b, -1)}>↑</button>
                    <span style={{ margin: "0 4px" }}>{b.order}</span>
                    <button className="icon-btn" title="Move down" onClick={() => moveBanner(b, 1)}>↓</button>
                  </td>
                  <td>
                    <span className={`status-pill small ${b.active ? "approved" : "rejected"}`}>{b.active ? "active" : "hidden"}</span>
                  </td>
                  <td className="td-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => toggleBanner(b)}>{b.active ? "Hide" : "Show"}</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteBanner(b)}>Delete</button>
                  </td>
                </tr>
              ))}
              {(homepage?.banners || []).length === 0 && (
                <tr><td colSpan={7} className="empty-row">No banners — the storefront shows the default hero.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={addBanner} className="form-grid-2" style={{ alignItems: "end" }}>
          <div className="form-field"><label>Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Big Season Sale" /></div>
          <div className="form-field"><label>Subtitle</label>
            <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Up to 40% off electronics" /></div>
          <div className="form-field"><label>Link</label>
            <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/shop" /></div>
          <div className="form-field"><label>Button text</label>
            <input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} /></div>
          <div className="form-field"><label>Banner image</label>
            <input id="banner-image-input" type="file" accept="image/*" /></div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={busy}>+ Add Banner</button>
          </div>
        </form>
      </div>

      {/* Sections */}
      <div className="detail-card settings-cards">
        <span className="card-title">Homepage Sections</span>
        {Object.entries(SECTION_LABELS).map(([key, label]) => (
          <div key={key} className="inline-actions" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 14 }}>{label}</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={!!homepage?.sections?.[key]} onChange={() => toggleSection(key)} />
              <span className="toggle-slider" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
