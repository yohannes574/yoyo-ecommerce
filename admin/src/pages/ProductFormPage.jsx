import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const isEdit = Boolean(id);
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
          Number(form.price) *
            (1 - Number(form.discountPercent) / 100)
        )
      : null;

  // --------------------------------------------------
  // Load categories
  // --------------------------------------------------
  useEffect(() => {
    api
      .get("/admin/categories")
      .then((res) => {
        setCategories(res.data?.categories || []);
      })
      .catch((err) => {
        console.error("Failed to load categories:", err);
      });
  }, []);

  // --------------------------------------------------
  // Load product when editing
  // --------------------------------------------------
  useEffect(() => {
    if (!isEdit) {
      setPageLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProduct() {
      try {
        setPageLoading(true);
        setError("");

        const res = await api.get(`/admin/products/${id}`);

        const product = res.data?.product;

        if (!product) {
          throw new Error("Product was not found.");
        }

        if (cancelled) return;

        const specifications =
          product.specifications &&
          typeof product.specifications === "object" &&
          !Array.isArray(product.specifications)
            ? Object.entries(product.specifications).map(
                ([key, value]) => ({
                  key,
                  value: value ?? "",
                })
              )
            : [];

        const categoryId =
          product.category &&
          typeof product.category === "object"
            ? product.category.id ||
              product.category._id ||
              ""
            : product.category || "";

        setForm({
          name: product.name || "",
          sku: product.sku || "",
          brand: product.brand || "",
          category: categoryId,
          description: product.description || "",

          price:
            product.price !== undefined &&
            product.price !== null
              ? String(product.price)
              : "",

          discountPercent:
            product.discountPercent !== undefined &&
            product.discountPercent !== null
              ? String(product.discountPercent)
              : "",

          stock:
            product.stock !== undefined &&
            product.stock !== null
              ? String(product.stock)
              : "",

          lowStockThreshold:
            product.lowStockThreshold !== undefined &&
            product.lowStockThreshold !== null
              ? String(product.lowStockThreshold)
              : "5",

          status: product.status || "active",

          specifications:
            specifications.length > 0
              ? specifications
              : [{ key: "", value: "" }],

          variants: Array.isArray(product.variants)
            ? product.variants.map((variant) => ({
                name: variant.name || "",
                sku: variant.sku || "",
                price:
                  variant.price !== undefined &&
                  variant.price !== null
                    ? variant.price
                    : "",
                stock:
                  variant.stock !== undefined &&
                  variant.stock !== null
                    ? variant.stock
                    : "",
              }))
            : [],
        });

        setExistingImages(
          Array.isArray(product.images)
            ? product.images.filter(Boolean)
            : []
        );
      } catch (err) {
        console.error("FAILED TO LOAD PRODUCT:", err);

        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to load product."
          );
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  // --------------------------------------------------
  // General fields
  // --------------------------------------------------
  function setField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  // --------------------------------------------------
  // Specifications
  // --------------------------------------------------
  function setSpec(index, key, value) {
    setForm((prev) => {
      const specifications = [...prev.specifications];

      specifications[index] = {
        ...specifications[index],
        [key]: value,
      };

      return {
        ...prev,
        specifications,
      };
    });
  }

  function addSpec() {
    setForm((prev) => ({
      ...prev,
      specifications: [
        ...prev.specifications,
        {
          key: "",
          value: "",
        },
      ],
    }));
  }

  function removeSpec(index) {
    setForm((prev) => ({
      ...prev,
      specifications: prev.specifications.filter(
        (_, i) => i !== index
      ),
    }));
  }

  // --------------------------------------------------
  // Variants
  // --------------------------------------------------
  function addVariant() {
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          name: "",
          sku: "",
          price: "",
          stock: "",
        },
      ],
    }));
  }

  function removeVariant(index) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter(
        (_, i) => i !== index
      ),
    }));
  }

  function setVariantField(index, key, value) {
    setForm((prev) => {
      const variants = [...prev.variants];

      variants[index] = {
        ...variants[index],
        [key]: value,
      };

      return {
        ...prev,
        variants,
      };
    });
  }

  // --------------------------------------------------
  // Image selection
  // --------------------------------------------------
  function handleImageChange(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    setNewImages((prev) => [
      ...prev,
      ...files,
    ]);

    const previews = files.map((file) =>
      URL.createObjectURL(file)
    );

    setNewImagePreviews((prev) => [
      ...prev,
      ...previews,
    ]);

    event.target.value = "";
  }

  function removeNewImage(index) {
    const preview = newImagePreviews[index];

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setNewImages((prev) =>
      prev.filter((_, i) => i !== index)
    );

    setNewImagePreviews((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  function removeExistingImage(index) {
    setExistingImages((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      let uploadedUrls = [];

      // Upload new images
      if (newImages.length > 0) {
        const formData = new FormData();

        newImages.forEach((file) => {
          formData.append("images", file);
        });

        const uploadResponse = await api.post(
          "/admin/products/upload",
          formData
        );

        uploadedUrls =
          uploadResponse.data?.urls || [];

        if (!Array.isArray(uploadedUrls)) {
          throw new Error(
            "Image upload did not return image URLs."
          );
        }
      }

      // Specifications
      const specifications = {};

      form.specifications.forEach((spec) => {
        const key = spec.key?.trim();

        if (key) {
          specifications[key] =
            spec.value ?? "";
        }
      });

      // Variants
      const variants = form.variants
        .filter((variant) => variant.name?.trim())
        .map((variant) => ({
          name: variant.name.trim(),
          sku: variant.sku?.trim() || "",

          price:
            variant.price === "" ||
            variant.price === null
              ? null
              : Math.max(
                  0,
                  Number(variant.price)
                ),

          stock: Math.max(
            0,
            parseInt(variant.stock, 10) || 0
          ),
        }));

      // Product payload
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category,
        brand: form.brand.trim(),
        description: form.description,

        price: Number(form.price),

        discountPercent:
          Number(form.discountPercent) || 0,

        stock:
          parseInt(form.stock, 10) || 0,

        lowStockThreshold:
          parseInt(
            form.lowStockThreshold,
            10
          ) || 5,

        status: form.status,

        images: [
          ...existingImages,
          ...uploadedUrls,
        ],

        variants,
        specifications,
      };

      // Edit
      if (isEdit) {
        await api.put(
          `/admin/products/${id}`,
          payload
        );

        setSuccess(
          "Product updated successfully!"
        );

        setNewImages([]);
        setNewImagePreviews([]);
      }

      // Create
      else {
        const response = await api.post(
          "/admin/products",
          payload
        );

        setSuccess(
          "Product created successfully!"
        );

        const newId =
          response.data?.product?.id ||
          response.data?.product?._id;

        if (newId) {
          navigate(
            `/products/${newId}/edit`
          );
        }
      }
    } catch (err) {
      console.error(
        "PRODUCT SAVE ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save product."
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------
  if (pageLoading) {
    return (
      <div className="page-loading">
        <span className="spinner" />
      </div>
    );
  }

  // --------------------------------------------------
  // Page
  // --------------------------------------------------
  return (
    <div className="product-editor-page">

      {/* HEADER */}
      <div className="product-editor-header">

        <div>
          <button
            type="button"
            className="editor-back-btn"
            onClick={() =>
              navigate("/products")
            }
          >
            ← Back to Products
          </button>

          <div className="editor-title-row">
            <div>
              <h1 className="editor-title">
                {isEdit
                  ? "Edit Product"
                  : "Add Product"}
              </h1>

              <p className="editor-subtitle">
                {isEdit
                  ? "Update your product information, pricing and inventory."
                  : "Create a new product for your store."}
              </p>
            </div>

            {isEdit && (
              <span
                className={`editor-status-badge ${
                  form.status === "active"
                    ? "active"
                    : "draft"
                }`}
              >
                {form.status === "active"
                  ? "Active"
                  : "Draft"}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            navigate("/products")
          }
          disabled={loading}
        >
          Cancel
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="editor-alert editor-alert-error">
          <div>
            <strong>Something went wrong</strong>
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="editor-alert editor-alert-success">
          <div>
            <strong>Success</strong>
            <span>{success}</span>
          </div>

          <button
            type="button"
            onClick={() => setSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      <form
        className="product-editor-form"
        onSubmit={handleSubmit}
      >

        {/* MAIN GRID */}
        <div className="product-editor-grid">

          {/* LEFT COLUMN */}
          <div className="product-editor-main">

            {/* PRODUCT INFORMATION */}
            <section className="editor-card">

              <div className="editor-card-header">
                <div>
                  <span className="editor-section-number">
                    01
                  </span>

                  <div>
                    <h2>
                      Product Information
                    </h2>

                    <p>
                      Basic information about
                      your product.
                    </p>
                  </div>
                </div>
              </div>

              <div className="editor-card-body">

                <div className="form-field">
                  <label>
                    Product Name
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    placeholder="Enter product name"
                    onChange={(e) =>
                      setField(
                        "name",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="editor-two-column">

                  <div className="form-field">
                    <label>
                      SKU
                      <span>*</span>
                    </label>

                    <input
                      type="text"
                      value={form.sku}
                      placeholder="e.g. IP15-BLK-128"
                      onChange={(e) =>
                        setField(
                          "sku",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>
                      Brand
                    </label>

                    <input
                      type="text"
                      value={form.brand}
                      placeholder="Enter brand"
                      onChange={(e) =>
                        setField(
                          "brand",
                          e.target.value
                        )
                      }
                    />
                  </div>

                </div>

                <div className="form-field">
                  <label>
                    Category
                    <span>*</span>
                  </label>

                  <select
                    value={form.category}
                    onChange={(e) =>
                      setField(
                        "category",
                        e.target.value
                      )
                    }
                    required
                  >
                    <option value="">
                      Select category
                    </option>

                    {categories.map(
                      (category) => {
                        const categoryId =
                          category.id ||
                          category._id;

                        return (
                          <option
                            key={categoryId}
                            value={categoryId}
                          >
                            {category.name}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>

                <div className="form-field">
                  <label>
                    Description
                  </label>

                  <textarea
                    rows={7}
                    value={form.description}
                    placeholder="Describe your product..."
                    onChange={(e) =>
                      setField(
                        "description",
                        e.target.value
                      )
                    }
                  />
                </div>

              </div>
            </section>

            {/* IMAGES */}
            <section className="editor-card">

              <div className="editor-card-header">
                <div>
                  <span className="editor-section-number">
                    02
                  </span>

                  <div>
                    <h2>
                      Product Images
                    </h2>

                    <p>
                      Manage the images
                      displayed in your store.
                    </p>
                  </div>
                </div>

                <span className="editor-image-count">
                  {existingImages.length +
                    newImagePreviews.length}{" "}
                  images
                </span>
              </div>

              <div className="editor-card-body">

                <div className="modern-image-grid">

                  {existingImages.map(
                    (image, index) => {
                      const imageUrl =
                        getImageUrl(image);

                      return (
                        <div
                          className="modern-image-item"
                          key={`${image}-${index}`}
                        >
                          <img
                            src={imageUrl}
                            alt={`Product ${index + 1}`}
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />

                          {index === 0 && (
                            <span className="primary-image-badge">
                              Main
                            </span>
                          )}

                          <button
                            type="button"
                            className="modern-image-remove"
                            onClick={() =>
                              removeExistingImage(
                                index
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      );
                    }
                  )}

                  {newImagePreviews.map(
                    (src, index) => (
                      <div
                        key={`new-${index}`}
                        className="modern-image-item new-image"
                      >
                        <img
                          src={src}
                          alt={`New product ${
                            index + 1
                          }`}
                        />

                        <span className="new-image-badge">
                          New
                        </span>

                        <button
                          type="button"
                          className="modern-image-remove"
                          onClick={() =>
                            removeNewImage(
                              index
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}

                  <button
                    type="button"
                    className="modern-upload-box"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                  >
                    <span className="upload-icon">
                      +
                    </span>

                    <strong>
                      Add images
                    </strong>

                    <small>
                      JPG, PNG, WEBP or GIF
                    </small>
                  </button>

                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple
                  hidden
                  onChange={handleImageChange}
                />

                <p className="image-help-text">
                  The first image will be used
                  as the main product image.
                </p>

              </div>
            </section>

            {/* SPECIFICATIONS */}
            <section className="editor-card">

              <div className="editor-card-header">
                <div>
                  <span className="editor-section-number">
                    03
                  </span>

                  <div>
                    <h2>
                      Specifications
                    </h2>

                    <p>
                      Add technical details
                      and product attributes.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="editor-add-btn"
                  onClick={addSpec}
                >
                  + Add Specification
                </button>
              </div>

              <div className="editor-card-body">

                <div className="specification-list">

                  {form.specifications.map(
                    (spec, index) => (
                      <div
                        className="specification-row"
                        key={index}
                      >
                        <div className="spec-index">
                          {String(index + 1).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div className="form-field">
                          <label>
                            Key
                          </label>

                          <input
                            type="text"
                            value={spec.key}
                            placeholder="RAM"
                            onChange={(e) =>
                              setSpec(
                                index,
                                "key",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="form-field">
                          <label>
                            Value
                          </label>

                          <input
                            type="text"
                            value={spec.value}
                            placeholder="16GB"
                            onChange={(e) =>
                              setSpec(
                                index,
                                "value",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <button
                          type="button"
                          className="row-remove-btn"
                          onClick={() =>
                            removeSpec(index)
                          }
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}

                </div>

              </div>
            </section>

            {/* VARIANTS */}
            <section className="editor-card">

              <div className="editor-card-header">
                <div>
                  <span className="editor-section-number">
                    04
                  </span>

                  <div>
                    <h2>
                      Variants
                    </h2>

                    <p>
                      Create different versions
                      of this product.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="editor-add-btn"
                  onClick={addVariant}
                >
                  + Add Variant
                </button>
              </div>

              <div className="editor-card-body">

                {form.variants.length === 0 ? (
                  <div className="empty-variant-state">
                    <div className="empty-variant-icon">
                      +
                    </div>

                    <strong>
                      No variants yet
                    </strong>

                    <span>
                      Add variants such as
                      different colors,
                      storage options or sizes.
                    </span>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={addVariant}
                    >
                      Add First Variant
                    </button>
                  </div>
                ) : (
                  <div className="variant-list">

                    {form.variants.map(
                      (variant, index) => (
                        <div
                          className="variant-card"
                          key={index}
                        >
                          <div className="variant-number">
                            {String(index + 1).padStart(
                              2,
                              "0"
                            )}
                          </div>

                          <div className="variant-fields">

                            <div className="form-field">
                              <label>
                                Name
                              </label>

                              <input
                                type="text"
                                placeholder="Color: Black"
                                value={
                                  variant.name
                                }
                                onChange={(e) =>
                                  setVariantField(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="form-field">
                              <label>
                                SKU
                              </label>

                              <input
                                type="text"
                                placeholder="Variant SKU"
                                value={
                                  variant.sku
                                }
                                onChange={(e) =>
                                  setVariantField(
                                    index,
                                    "sku",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="form-field">
                              <label>
                                Price
                              </label>

                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={
                                  variant.price
                                }
                                onChange={(e) =>
                                  setVariantField(
                                    index,
                                    "price",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="form-field">
                              <label>
                                Stock
                              </label>

                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={
                                  variant.stock
                                }
                                onChange={(e) =>
                                  setVariantField(
                                    index,
                                    "stock",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                          </div>

                          <button
                            type="button"
                            className="row-remove-btn"
                            onClick={() =>
                              removeVariant(
                                index
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}

                  </div>
                )}

              </div>
            </section>

          </div>

          {/* RIGHT COLUMN */}
          <aside className="product-editor-sidebar">

            {/* PRICING */}
            <section className="editor-card">

              <div className="editor-card-header compact">
                <div>
                  <span className="editor-section-number">
                    05
                  </span>

                  <div>
                    <h2>
                      Price & Inventory
                    </h2>

                    <p>
                      Control pricing and stock.
                    </p>
                  </div>
                </div>
              </div>

              <div className="editor-card-body">

                <div className="form-field">
                  <label>
                    Price
                    <span>*</span>
                  </label>

                  <div className="input-with-suffix">
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      placeholder="0"
                      onChange={(e) =>
                        setField(
                          "price",
                          e.target.value
                        )
                      }
                      required
                    />

                    <span>
                      ETB
                    </span>
                  </div>
                </div>

                <div className="form-field">
                  <label>
                    Discount
                  </label>

                  <div className="input-with-suffix">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={
                        form.discountPercent
                      }
                      placeholder="0"
                      onChange={(e) =>
                        setField(
                          "discountPercent",
                          e.target.value
                        )
                      }
                    />

                    <span>%</span>
                  </div>
                </div>

                {salePrice !== null && (
                  <div className="sale-preview-card">
                    <span>
                      Customer pays
                    </span>

                    <strong>
                      {salePrice.toLocaleString()} ETB
                    </strong>

                    <small>
                      After discount
                    </small>
                  </div>
                )}

                <div className="editor-divider" />

                <div className="form-field">
                  <label>
                    Stock
                    <span>*</span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    placeholder="0"
                    onChange={(e) =>
                      setField(
                        "stock",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label>
                    Low Stock Threshold
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      form.lowStockThreshold
                    }
                    placeholder="5"
                    onChange={(e) =>
                      setField(
                        "lowStockThreshold",
                        e.target.value
                      )
                    }
                  />

                  <small className="field-help">
                    You'll be alerted when stock
                    reaches this number.
                  </small>
                </div>

                <div className="form-field">
                  <label>
                    Product Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      setField(
                        "status",
                        e.target.value
                      )
                    }
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="draft">
                      Draft
                    </option>
                  </select>
                </div>

              </div>
            </section>

            {/* PRODUCT SUMMARY */}
            <section className="editor-summary-card">

              <div className="summary-label">
                PRODUCT SUMMARY
              </div>

              <div className="summary-product-name">
                {form.name ||
                  "Untitled Product"}
              </div>

              <div className="summary-row">
                <span>
                  SKU
                </span>

                <strong>
                  {form.sku || "—"}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Category
                </span>

                <strong>
                  {categories.find(
                    (category) =>
                      String(
                        category.id ||
                          category._id
                      ) ===
                      String(form.category)
                  )?.name || "—"}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Images
                </span>

                <strong>
                  {existingImages.length +
                    newImagePreviews.length}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Stock
                </span>

                <strong>
                  {form.stock || "0"}
                </strong>
              </div>

            </section>

          </aside>
        </div>

        {/* SAVE BAR */}
        <div className="product-editor-savebar">

          <div>
            <strong>
              {isEdit
                ? "Ready to save your changes?"
                : "Ready to create this product?"}
            </strong>

            <span>
              Your changes will be saved to
              the store.
            </span>
          </div>

          <div className="savebar-actions">

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                navigate("/products")
              }
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary editor-save-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Saving...
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Product"
              )}
            </button>

          </div>
        </div>

      </form>
    </div>
  );
}

