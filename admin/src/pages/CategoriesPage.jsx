
import { useEffect, useState } from "react";
import api from "../api/axios";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  parent: "",
  image: "",
  order: "0",
  active: true,
};

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --------------------------------------------------
  // LOAD CATEGORIES
  // --------------------------------------------------

  async function loadCategories() {
    setLoading(true);

    try {
      const response = await api.get("/admin/categories");

      setCategories(response.data?.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load categories."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // --------------------------------------------------
  // CREATE
  // --------------------------------------------------

  function openCreate(parentId = "") {
    setEditCat(null);

    setForm({
      ...EMPTY_FORM,
      parent: parentId || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  // --------------------------------------------------
  // EDIT
  // --------------------------------------------------

  function openEdit(cat) {
    setEditCat(cat);

    setForm({
      name: cat.name || "",
      slug: cat.slug || "",
      description: cat.description || "",
      parent: cat.parent?.id || "",
      image: cat.image || "",
      order:
        cat.order !== undefined && cat.order !== null
          ? String(cat.order)
          : "0",
      active: cat.active !== false,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

  function handleNameChange(value) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: editCat ? prev.slug : slugify(value),
    }));
  }

  function setField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  // --------------------------------------------------
  // SAVE CATEGORY
  // --------------------------------------------------

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        parent: form.parent || null,
        image: form.image || "",
        order: Number(form.order) || 0,
        active: form.active,
      };

      if (editCat) {
        // IMPORTANT:
        // Backend uses PUT, NOT PATCH.
        const response = await api.put(
          `/admin/categories/${editCat.id}`,
          payload
        );

        console.log("CATEGORY UPDATED:", response.data);

        setSuccess("Category updated successfully.");
      } else {
        const response = await api.post(
          "/admin/categories",
          payload
        );

        console.log("CATEGORY CREATED:", response.data);

        setSuccess("Category created successfully.");
      }

      setShowModal(false);

      await loadCategories();
    } catch (err) {
      console.error("CATEGORY SAVE ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Failed to save category."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  async function handleDelete(cat) {
    const confirmed = window.confirm(
      `Delete "${cat.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/admin/categories/${cat.id}`);

      setSuccess("Category deleted successfully.");

      await loadCategories();
    } catch (err) {
      console.error("CATEGORY DELETE ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Cannot delete this category."
      );
    }
  }

  // --------------------------------------------------
  // TOGGLE ACTIVE
  // --------------------------------------------------

  async function toggleStatus(cat) {
    const newActive = cat.active === false;

    setError("");
    setSuccess("");

    try {
      await api.put(`/admin/categories/${cat.id}`, {
        active: newActive,
      });

      setCategories((prev) =>
        prev.map((category) => {
          if (category.id === cat.id) {
            return {
              ...category,
              active: newActive,
            };
          }

          return {
            ...category,
            subcategories: (category.subcategories || []).map(
              (sub) =>
                sub.id === cat.id
                  ? {
                      ...sub,
                      active: newActive,
                    }
                  : sub
            ),
          };
        })
      );

      setSuccess(
        newActive
          ? "Category enabled."
          : "Category disabled."
      );

      await loadCategories();
    } catch (err) {
      console.error("CATEGORY STATUS ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Failed to change category status."
      );
    }
  }

  // --------------------------------------------------
  // PARENT CATEGORIES
  // --------------------------------------------------

  const parentCats = categories.filter(
    (category) => !category.parent
  );

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>

          <p className="page-desc">
            Manage your product categories and subcategories
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => openCreate()}
        >
          + Add Category
        </button>
      </div>

      {error && (
        <div className="alert-error">
          {error}

          <button onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="alert-success">
          {success}

          <button onClick={() => setSuccess("")}>
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="page-loading">
          <span className="spinner" />
        </div>
      ) : (
        <div className="cat-tree">
          {parentCats.map((cat) => (
            <div
              key={cat.id}
              className="cat-parent-block"
            >
              {/* Parent category */}

              <div className="cat-row parent-row">
                <div className="cat-info">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="cat-icon"
                    />
                  ) : null}

                  <div>
                    <strong className="cat-name">
                      {cat.name}
                    </strong>

                    <span className="cat-slug">
                      /{cat.slug}
                    </span>

                    {cat.productCount !== undefined && (
                      <span className="cat-sub-count">
                        {cat.productCount} products
                      </span>
                    )}

                    {cat.subcategories?.length > 0 && (
                      <span className="cat-sub-count">
                        {cat.subcategories.length} subcategories
                      </span>
                    )}
                  </div>
                </div>

                <div className="cat-actions">
                  <span
                    className={`status-dot ${
                      cat.active ? "active" : "inactive"
                    }`}
                  />

                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => toggleStatus(cat)}
                  >
                    {cat.active
                      ? "Disable"
                      : "Enable"}
                  </button>

                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => openEdit(cat)}
                  >
                    Edit
                  </button>

                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => openCreate(cat.id)}
                  >
                    + Sub
                  </button>

                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(cat)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Subcategories */}

              {(cat.subcategories || []).map((sub) => (
                <div
                  key={sub.id}
                  className="cat-row sub-row"
                >
                  <div className="cat-info">
                    <span className="sub-indent">
                      └
                    </span>

                    {sub.image ? (
                      <img
                        src={sub.image}
                        alt={sub.name}
                        className="cat-icon"
                      />
                    ) : null}

                    <div>
                      <span className="cat-name">
                        {sub.name}
                      </span>

                      <span className="cat-slug">
                        /{sub.slug}
                      </span>
                    </div>
                  </div>

                  <div className="cat-actions">
                    <span
                      className={`status-dot ${
                        sub.active
                          ? "active"
                          : "inactive"
                      }`}
                    />

                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => toggleStatus(sub)}
                    >
                      {sub.active
                        ? "Disable"
                        : "Enable"}
                    </button>

                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => openEdit(sub)}
                    >
                      Edit
                    </button>

                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(sub)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {parentCats.length === 0 && (
            <div className="empty-state">
              No categories yet. Click "Add Category"
              to get started.
            </div>
          )}
        </div>
      )}

      {/* Modal */}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h2>
                {editCat
                  ? "Edit Category"
                  : "Add Category"}
              </h2>

              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="alert-error">
                {error}
              </div>
            )}

            <div className="modal-body">
              <div className="form-field">
                <label>Name *</label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    handleNameChange(e.target.value)
                  }
                  placeholder="e.g. Electronics"
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label>Slug</label>

                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setField("slug", e.target.value)
                  }
                  placeholder="electronics"
                />
              </div>

              <div className="form-field">
                <label>Description</label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setField(
                      "description",
                      e.target.value
                    )
                  }
                  placeholder="Category description"
                  rows="3"
                />
              </div>

              <div className="form-field">
                <label>Parent Category</label>

                <select
                  value={form.parent}
                  onChange={(e) =>
                    setField("parent", e.target.value)
                  }
                >
                  <option value="">
                    None (Top-level)
                  </option>

                  {parentCats
                    .filter(
                      (c) =>
                        !editCat ||
                        c.id !== editCat.id
                    )
                    .map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                      >
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-field">
                <label>Image URL</label>

                <input
                  type="text"
                  value={form.image}
                  onChange={(e) =>
                    setField("image", e.target.value)
                  }
                  placeholder="/uploads/products/image.jpg"
                />
              </div>

              <div className="form-field">
                <label>Order</label>

                <input
                  type="number"
                  value={form.order}
                  onChange={(e) =>
                    setField("order", e.target.value)
                  }
                  min="0"
                />
              </div>

              <div className="form-field">
                <label>Status</label>

                <select
                  value={form.active ? "active" : "inactive"}
                  onChange={(e) =>
                    setField(
                      "active",
                      e.target.value === "active"
                    )
                  }
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() =>
                  setShowModal(false)
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <span className="btn-spinner" />
                ) : editCat ? (
                  "Save Changes"
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

