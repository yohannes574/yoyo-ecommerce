import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

const EMPTY_FORM = {
  name: "", sku: "", brand: "", category: "",
  description: "", price: "", discountPercent: "", stock: "",
  lowStockThreshold: "5", status: "active",
  specifications: [{ key: "", value: "" }],
  variants: [], // flat rows matching the Product model: { name, sku, price, stock }
};

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Computed sale price
  const salePrice = form.price && form.discountPercent
    ? Math.round(parseFloat(form.price) * (1 - parseFloat(form.discountPercent) / 100))
    : null;

  useEffect(() => {
    api.get("/admin/categories").then((r) => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/admin/products/${id}`)
      .then((r) => {
        const p = r.data.product;
        // Server sends specifications as an object map { Key: "Value" } — convert to rows
        const specEntries = p.specifications && typeof p.specifications === "object"
          ? Object.entries(p.specifications).map(([key, value]) => ({ key, value }))
          : [];
        setForm({
          name: p.name || "",
          sku: p.sku || "",
          brand: p.brand || "",
          category: p.category?.id || p.category || "",
          description: p.description || "",
          price: String(p.price || ""),
          discountPercent: String(p.discountPercent || ""),
          stock: String(p.stock || ""),
          lowStockThreshold: String(p.lowStockThreshold || "5"),
          status: p.status || "active",
          specifications: specEntries.length ? specEntries : [{ key: "", value: "" }],
          variants: (p.variants || []).map((v) => ({
            name: v.name || "",
            sku: v.sku || "",
            price: v.price ?? "",
            stock: v.stock ?? "",
          })),
        });
        setExistingImages(p.images || []);
      })
      .catch(() => setError("Failed to load product."))
      .finally(() => setPageLoading(false));
  }, [id, isEdit]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Specifications
  function setSpec(i, key, value) {
    setForm((f) => {
      const specs = [...f.specifications];
      specs[i] = { ...specs[i], [key]: value };
      return { ...f, specifications: specs };
    });
  }
  function addSpec() {
    setForm((f) => ({ ...f, specifications: [...f.specifications, { key: "", value: "" }] }));
  }
  function removeSpec(i) {
    setForm((f) => ({ ...f, specifications: f.specifications.filter((_, idx) => idx !== i) }));
  }

  // Variants (flat rows: one option per row, like the seed data "Size 40", "8GB RAM / 512GB SSD")
  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, { name: "", sku: "", price: "", stock: "" }] }));
  }
  function removeVariant(vi) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== vi) }));
  }
  function setVariantField(vi, key, val) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[vi] = { ...variants[vi], [key]: val };
      return { ...f, variants };
    });
  }

  // Images
  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    setNewImages((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setNewImagePreviews((prev) => [...prev, ...previews]);
  }
  function removeNewImage(i) {
    setNewImages((prev) => prev.filter((_, idx) => idx !== i));
    setNewImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  }
  function removeExistingImage(i) {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      // 1. Upload new image files via the dedicated multipart endpoint
      let uploadedUrls = [];
      if (newImages.length > 0) {
        const fd = new FormData();
        newImages.forEach((f) => fd.append("images", f));
        const up = await api.post("/admin/products/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedUrls = up.data.urls || [];
      }

      // 2. Build the JSON payload the API expects
      const specifications = {};
      form.specifications.forEach((s) => {
        if (s.key?.trim()) specifications[s.key.trim()] = s.value ?? "";
      });
      const variants = form.variants
        .filter((v) => v.name?.trim())
        .map((v) => ({
          name: v.name.trim(),
          sku: v.sku?.trim() || "",
          price: v.price === "" || v.price === null ? null : Math.max(0, Number(v.price)),
          stock: Math.max(0, parseInt(v.stock, 10) || 0),
        }));

      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        brand: form.brand,
        description: form.description,
        price: Number(form.price),
        discountPercent: Number(form.discountPercent) || 0,
        stock: parseInt(form.stock, 10) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold, 10) || 5,
        status: form.status,
        images: [...existingImages, ...uploadedUrls],
        variants,
        specifications,
      };

      // 3. Save via JSON (PUT for edit, POST for create)
      if (isEdit) {
        await api.put(`/admin/products/${id}`, payload);
        setSuccess("Product updated successfully!");
      } else {
        const r = await api.post("/admin/products", payload);
        setSuccess("Product created successfully!");
        navigate(`/products/${r.data.product.id}/edit`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save product.");
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) return <div className="page-loading"><span className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">
          <button className="btn-link" onClick={() => navigate("/products")}>← Products</button>
          <span className="breadcrumb-sep">/</span>
          <strong>{isEdit ? "Edit Product" : "Add Product"}</strong>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/products")}>Cancel</button>
          <button type="submit" form="product-form" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : isEdit ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error} <button onClick={() => setError("")}>×</button></div>}
      {success && <div className="alert-success">{success} <button onClick={() => setSuccess("")}>×</button></div>}

      <form id="product-form" onSubmit={handleSubmit} className="product-form">
        <div className="form-grid">
          {/* Left — Main Info */}
          <div className="form-main">
            {/* Basic Info */}
            <div className="form-section">
              <h2 className="section-title">Basic Information</h2>
              <div className="field-row">
                <div className="form-field">
                  <label>Product Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} required placeholder="e.g. Samsung Galaxy A55" />
                </div>
                <div className="form-field">
                  <label>SKU *</label>
                  <input type="text" value={form.sku} onChange={(e) => setField("sku", e.target.value)} required placeholder="e.g. SAM-A55-BLK" />
                </div>
              </div>
              <div className="field-row">
                <div className="form-field">
                  <label>Brand</label>
                  <input type="text" value={form.brand} onChange={(e) => setField("brand", e.target.value)} placeholder="e.g. Samsung" />
                </div>
                <div className="form-field">
                  <label>Category *</label>
                  <select value={form.category} onChange={(e) => setField("category", e.target.value)} required>
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={4} placeholder="Full product description…" />
              </div>
            </div>

            {/* Pricing */}
            <div className="form-section">
              <h2 className="section-title">Pricing</h2>
              <div className="field-row">
                <div className="form-field">
                  <label>Price (ETB) *</label>
                  <input type="number" value={form.price} onChange={(e) => setField("price", e.target.value)} required min="0" placeholder="0" />
                </div>
                <div className="form-field">
                  <label>Discount (%)</label>
                  <input type="number" value={form.discountPercent} onChange={(e) => setField("discountPercent", e.target.value)} min="0" max="100" placeholder="0" />
                </div>
                {salePrice !== null && (
                  <div className="form-field">
                    <label>Sale Price</label>
                    <div className="computed-field">{salePrice.toLocaleString()} ETB</div>
                  </div>
                )}
              </div>
            </div>

            {/* Inventory */}
            <div className="form-section">
              <h2 className="section-title">Inventory</h2>
              <div className="field-row">
                <div className="form-field">
                  <label>Stock *</label>
                  <input type="number" value={form.stock} onChange={(e) => setField("stock", e.target.value)} required min="0" placeholder="0" />
                </div>
                <div className="form-field">
                  <label>Low Stock Threshold</label>
                  <input type="number" value={form.lowStockThreshold} onChange={(e) => setField("lowStockThreshold", e.target.value)} min="0" placeholder="5" />
                </div>
              </div>
            </div>

            {/* Specifications */}
            <div className="form-section">
              <div className="section-header-row">
                <h2 className="section-title">Specifications</h2>
                <button type="button" className="btn btn-sm btn-secondary" onClick={addSpec}>+ Add</button>
              </div>
              {form.specifications.map((spec, i) => (
                <div key={i} className="spec-row">
                  <input type="text" placeholder="Key (e.g. RAM)" value={spec.key} onChange={(e) => setSpec(i, "key", e.target.value)} />
                  <input type="text" placeholder="Value (e.g. 8GB)" value={spec.value} onChange={(e) => setSpec(i, "value", e.target.value)} />
                  <button type="button" className="icon-btn remove" onClick={() => removeSpec(i)}>×</button>
                </div>
              ))}
            </div>

            {/* Variants — one option per row (e.g. "8GB RAM / 512GB SSD" with its own price & stock) */}
            <div className="form-section">
              <div className="section-header-row">
                <h2 className="section-title">Variants</h2>
                <button type="button" className="btn btn-sm btn-secondary" onClick={addVariant}>+ Add Variant</button>
              </div>
              {form.variants.length === 0 && (
                <p className="text-muted text-sm">No variants. Products without variants use the main price and stock.</p>
              )}
              {form.variants.map((variant, vi) => (
                <div key={vi} className="option-row">
                  <input type="text" placeholder="Option (e.g. Size 42, 8GB / 512GB)" value={variant.name} onChange={(e) => setVariantField(vi, "name", e.target.value)} />
                  <input type="text" placeholder="SKU (optional)" value={variant.sku} onChange={(e) => setVariantField(vi, "sku", e.target.value)} />
                  <input type="number" placeholder="Price (blank = main price)" value={variant.price} onChange={(e) => setVariantField(vi, "price", e.target.value)} min="0" />
                  <input type="number" placeholder="Stock" value={variant.stock} onChange={(e) => setVariantField(vi, "stock", e.target.value)} min="0" />
                  <button type="button" className="icon-btn remove" onClick={() => removeVariant(vi)}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Images & Status */}
          <div className="form-sidebar">
            {/* Status */}
            <div className="form-section">
              <h2 className="section-title">Status</h2>
              <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            {/* Images */}
            <div className="form-section">
              <h2 className="section-title">Images</h2>
              <div className="image-grid">
                {existingImages.map((img, i) => (
                  <div key={`ex-${i}`} className="image-thumb-wrap">
                    <img src={`http://localhost:5001${img}`} alt="product" className="image-thumb" />
                    <button type="button" className="image-remove" onClick={() => removeExistingImage(i)}>×</button>
                  </div>
                ))}
                {newImagePreviews.map((src, i) => (
                  <div key={`new-${i}`} className="image-thumb-wrap">
                    <img src={src} alt="new" className="image-thumb" />
                    <button type="button" className="image-remove" onClick={() => removeNewImage(i)}>×</button>
                  </div>
                ))}
              </div>
              <div
                className="image-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p>Click to upload images</p>
                <span>PNG, JPG, WEBP — up to 10 files</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
