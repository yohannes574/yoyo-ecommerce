import { useEffect, useState } from "react";
import api from "../api/axios";

const EMPTY_FORM = { name: "", slug: "", icon: "", parent: "", status: "active" };

function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/[\s\W-]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null); // null = create
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function loadCategories() {
    setLoading(true);
    api.get("/admin/categories")
      .then((r) => setCategories(r.data.categories || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCategories(); }, []);

  function openCreate(parentId = "") {
    setEditCat(null);
    setForm({ ...EMPTY_FORM, parent: parentId });
    setError("");
    setShowModal(true);
  }

  function openEdit(cat) {
    setEditCat(cat);
    setForm({
      name: cat.name || "",
      slug: cat.slug || "",
      icon: cat.icon || "",
      parent: cat.parent?._id || cat.parent || "",
      status: cat.status || "active",
    });
    setError("");
    setShowModal(true);
  }

  function handleNameChange(val) {
    setForm((f) => ({ ...f, name: val, slug: editCat ? f.slug : slugify(val) }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    try {
      if (editCat) {
        await api.patch(`/admin/categories/${editCat._id}`, form);
        setSuccess("Category updated.");
      } else {
        await api.post("/admin/categories", form);
        setSuccess("Category created.");
      }
      setShowModal(false);
      loadCategories();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Delete "${cat.name}"? Products in this category will be unlinked.`)) return;
    try {
      await api.delete(`/admin/categories/${cat._id}`);
      setSuccess("Category deleted.");
      loadCategories();
    } catch (e) {
      setSuccess("");
      setError(e.response?.data?.message || "Cannot delete this category.");
    }
  }

  async function toggleStatus(cat) {
    const newStatus = cat.status === "active" ? "inactive" : "active";
    try {
      await api.patch(`/admin/categories/${cat._id}`, { status: newStatus });
      setCategories((prev) => prev.map((c) => {
        if (c._id === cat._id) return { ...c, status: newStatus };
        const subs = (c.subcategories || []).map((s) => s._id === cat._id ? { ...s, status: newStatus } : s);
        return { ...c, subcategories: subs };
      }));
    } catch { /* ignore */ }
  }

  const parentCats = categories.filter((c) => !c.parent);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-desc">Manage your product categories and subcategories</p>
        </div>
        <button className="btn btn-primary" onClick={() => openCreate()}>+ Add Category</button>
      </div>

      {error && <div className="alert-error">{error} <button onClick={() => setError("")}>×</button></div>}
      {success && <div className="alert-success">{success} <button onClick={() => setSuccess("")}>×</button></div>}

      {loading ? (
        <div className="page-loading"><span className="spinner" /></div>
      ) : (
        <div className="cat-tree">
          {parentCats.map((cat) => (
            <div key={cat._id} className="cat-parent-block">
              {/* Parent Category Row */}
              <div className="cat-row parent-row">
                <div className="cat-info">
                  {cat.icon && <span className="cat-icon">{cat.icon}</span>}
                  <div>
                    <strong className="cat-name">{cat.name}</strong>
                    <span className="cat-slug">/{cat.slug}</span>
                    {(cat.subcategories?.length > 0) && (
                      <span className="cat-sub-count">{cat.subcategories.length} subcategories</span>
                    )}
                  </div>
                </div>
                <div className="cat-actions">
                  <span className={`status-dot ${cat.status}`} />
                  <button className="btn btn-sm btn-secondary" onClick={() => toggleStatus(cat)}>
                    {cat.status === "active" ? "Disable" : "Enable"}
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={() => openEdit(cat)}>Edit</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => openCreate(cat._id)}>+ Sub</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cat)}>Delete</button>
                </div>
              </div>

              {/* Subcategory Rows */}
              {(cat.subcategories || []).map((sub) => (
                <div key={sub._id} className="cat-row sub-row">
                  <div className="cat-info">
                    <span className="sub-indent">└</span>
                    {sub.icon && <span className="cat-icon">{sub.icon}</span>}
                    <div>
                      <span className="cat-name">{sub.name}</span>
                      <span className="cat-slug">/{sub.slug}</span>
                    </div>
                  </div>
                  <div className="cat-actions">
                    <span className={`status-dot ${sub.status}`} />
                    <button className="btn btn-sm btn-secondary" onClick={() => toggleStatus(sub)}>
                      {sub.status === "active" ? "Disable" : "Enable"}
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(sub)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(sub)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {parentCats.length === 0 && (
            <div className="empty-state">No categories yet. Click "Add Category" to get started.</div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editCat ? "Edit Category" : "Add Category"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="alert-error">{error}</div>}
            <div className="modal-body">
              <div className="form-field">
                <label>Name *</label>
                <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Electronics" autoFocus />
              </div>
              <div className="form-field">
                <label>Slug</label>
                <input type="text" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="electronics" />
              </div>
              <div className="form-field">
                <label>Icon (emoji or text)</label>
                <input type="text" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="📱" />
              </div>
              <div className="form-field">
                <label>Parent Category</label>
                <select value={form.parent} onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}>
                  <option value="">None (Top-level)</option>
                  {parentCats.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="btn-spinner" /> : editCat ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
