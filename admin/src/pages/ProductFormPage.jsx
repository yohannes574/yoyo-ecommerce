import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getImageUrl } from "../utils/imageUrl";

const EMPTY_FORM = {
  name: "",
  sku: "",
  brand: "",
  category: "",
  description: "",
  price: "",
  discountPercent: "",
  stock: "",
  lowStockThreshold: "5",
  status: "active",
  specifications: [{ key: "", value: "" }],
  variants: [],
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

  const salePrice =
    form.price && form.discountPercent
      ? Math.round(
          parseFloat(form.price) *
            (1 - parseFloat(form.discountPercent) / 100)
        )
      : null;

  useEffect(() => {
    api
      .get("/admin/categories")
      .then((r) => setCategories(r.data.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    api
      .get(`/admin/products/${id}`)
      .then((r) => {
        const p = r.data.product;

        const specEntries =
          p.specifications && typeof p.specifications === "object"
            ? Object.entries(p.specifications).map(([key, value]) => ({
                key,
                value,
              }))
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
          specifications: specEntries.length
            ? specEntries
            : [{ key: "", value: "" }],
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

  function setSpec(i, key, value) {
    setForm((f) => {
      const specs = [...f.specifications];
      specs[i] = { ...specs[i], [key]: value };
      return { ...f, specifications: specs };
    });
  }

  function addSpec() {
    setForm((f) => ({
      ...f,
      specifications: [...f.specifications, { key: "", value: "" }],
    }));
  }

  function removeSpec(i) {
    setForm((f) => ({
      ...f,
      specifications: f.specifications.filter((_, idx) => idx !== i),
    }));
  }

  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        { name: "", sku: "", price: "", stock: "" },
      ],
    }));
  }

  function removeVariant(i) {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, idx) => idx !== i),
    }));
  }

  function setVariantField(i, key, value) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], [key]: value };
      return { ...f, variants };
    });
  }

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
      let uploadedUrls = [];

      if (newImages.length > 0) {
        const fd = new FormData();

        newImages.forEach((file) => {
          fd.append("images", file);
        });

        const up = await api.post("/admin/products/upload", fd);

        uploadedUrls = up.data.urls || [];
      }

      const specifications = {};

      form.specifications.forEach((s) => {
        if (s.key?.trim()) {
          specifications[s.key.trim()] = s.value ?? "";
        }
      });

      const variants = form.variants
        .filter((v) => v.name?.trim())
        .map((v) => ({
          name: v.name.trim(),
          sku: v.sku?.trim() || "",
          price:
            v.price === "" || v.price === null
              ? null
              : Math.max(0, Number(v.price)),
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
        lowStockThreshold:
          parseInt(form.lowStockThreshold, 10) || 5,
        status: form.status,
        images: [...existingImages, ...uploadedUrls],
        variants,
        specifications,
      };

      if (isEdit) {
        await api.put(`/admin/products/${id}`, payload);
        setSuccess("Product updated successfully!");
      } else {
        const r = await api.post("/admin/products", payload);
        setSuccess("Product created successfully!");
        navigate(`/products/${r.data.product.id}/edit`);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to save product."
      );
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="page-loading">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Your existing JSX remains exactly the same */}

      {/* Existing Images */}
      <div className="image-grid">
        {existingImages.map((img, i) => (
          <div key={`ex-${i}`} className="image-thumb-wrap">
            <img
              src={getImageUrl(img)}
              alt="product"
              className="image-thumb"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <button
              type="button"
              className="image-remove"
              onClick={() => removeExistingImage(i)}
            >
              ×
            </button>
          </div>
        ))}

        {newImagePreviews.map((src, i) => (
          <div key={`new-${i}`} className="image-thumb-wrap">
            <img
              src={src}
              alt="new"
              className="image-thumb"
            />
            <button
              type="button"
              className="image-remove"
              onClick={() => removeNewImage(i)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Keep the rest of your original JSX unchanged */}
    </div>
  );
}