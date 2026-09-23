const express = require("express");
const Product = require("../../models/Product");
const Category = require("../../models/Category");
const InvTransaction = require("../../models/InventoryTransaction");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { uploadProductImages } = require("../../middleware/upload");
const { ApiError, asyncHandler } = require("../../utils/apiError");
const { serializeProduct } = require("../../utils/serialize");

const router = express.Router();
router.use(adminProtect);

router.use("/", requirePermission("products"));

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * GET /api/admin/products
 * List products with filters, search, stock status, sorting, and pagination
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      search,
      category,
      status,
      stockStatus,
      sortBy = "newest",
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: "i" } },
        { sku: { $regex: term, $options: "i" } },
        { brand: { $regex: term, $options: "i" } },
      ];
    }

    if (category) {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = category;
      } else {
        const catDoc = await Category.findOne({ slug: category });
        if (catDoc) query.category = catDoc._id;
      }
    }

    if (status && ["draft", "active"].includes(status)) {
      query.status = status;
    }

    if (stockStatus === "out_of_stock") {
      query.stock = { $lte: 0 };
    } else if (stockStatus === "low_stock") {
      query.$expr = {
        $and: [
          { $gt: ["$stock", 0] },
          { $lte: ["$stock", "$lowStockThreshold"] },
        ],
      };
    } else if (stockStatus === "in_stock") {
      query.$expr = {
        $gt: ["$stock", "$lowStockThreshold"],
      };
    }

    let sort = { createdAt: -1 };
    if (sortBy === "oldest") sort = { createdAt: 1 };
    else if (sortBy === "price_asc") sort = { price: 1 };
    else if (sortBy === "price_desc") sort = { price: -1 };
    else if (sortBy === "stock_asc") sort = { stock: 1 };
    else if (sortBy === "stock_desc") sort = { stock: -1 };
    else if (sortBy === "name_asc") sort = { name: 1 };
    else if (sortBy === "name_desc") sort = { name: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate("category", "name slug")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
    ]);

    res.json({
      success: true,
      products: products.map(serializeProduct),
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  })
);

/**
 * POST /api/admin/products/upload
 * Multi-image file upload for product gallery
 */
router.post(
  "/upload",
  uploadProductImages.array("images", 10),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, "No image files uploaded");
    }

    const urls = req.files.map((file) => `/uploads/products/${file.filename}`);

    res.json({
      success: true,
      urls,
    });
  })
);

/**
 * GET /api/admin/products/:id
 * Single product detail
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate(
      "category",
      "name slug"
    );
    if (!product) throw new ApiError(404, "Product not found");

    res.json({
      success: true,
      product: serializeProduct(product),
    });
  })
);

/**
 * POST /api/admin/products
 * Create a new product
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      name,
      slug,
      sku,
      category,
      brand,
      description,
      price,
      discountPercent = 0,
      stock = 0,
      lowStockThreshold = 5,
      images = [],
      variants = [],
      specifications = {},
      status = "active",
      featured = false,
      newArrival = false,
      bestSeller = false,
    } = req.body;

    if (!name || !name.trim()) throw new ApiError(400, "Product name is required");
    if (!price || Number(price) < 0) throw new ApiError(400, "Valid price is required");
    if (!category) throw new ApiError(400, "Category is required");

    // Verify category exists
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) throw new ApiError(400, "Selected category does not exist");

    // Generate unique slug
    let baseSlug = slug ? slugify(slug) : slugify(name);
    let finalSlug = baseSlug;
    let count = 1;
    while (await Product.findOne({ slug: finalSlug })) {
      finalSlug = `${baseSlug}-${count++}`;
    }

    // Generate or validate SKU
    let finalSku = sku?.trim();
    if (!finalSku) {
      const prefix = (brand || name.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, "");
      finalSku = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    } else {
      const existingSku = await Product.findOne({ sku: finalSku });
      if (existingSku) throw new ApiError(400, `SKU '${finalSku}' is already in use`);
    }

    const numStock = Math.max(0, parseInt(stock, 10) || 0);

    const product = await Product.create({
      name: name.trim(),
      slug: finalSlug,
      sku: finalSku,
      category,
      brand: brand?.trim() || "",
      description: description?.trim() || "",
      price: Number(price),
      discountPercent: Math.max(0, Math.min(99, Number(discountPercent) || 0)),
      stock: numStock,
      lowStockThreshold: Math.max(0, parseInt(lowStockThreshold, 10) || 5),
      images: Array.isArray(images) ? images : [],
      variants: Array.isArray(variants) ? variants : [],
      specifications: specifications instanceof Map ? specifications : new Map(Object.entries(specifications || {})),
      status: ["draft", "active"].includes(status) ? status : "active",
      featured: !!featured,
      newArrival: !!newArrival,
      bestSeller: !!bestSeller,
    });

    // Record initial inventory transaction if stock > 0
    if (numStock > 0) {
      await InvTransaction.create({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        previousStock: 0,
        change: numStock,
        newStock: numStock,
        type: "RESTOCK",
        reason: "Initial stock upon product creation",
        performedBy: req.admin?.name || "Admin",
      });
    }

    const populated = await Product.findById(product._id).populate("category", "name slug");

    res.status(201).json({
      success: true,
      product: serializeProduct(populated),
    });
  })
);

/**
 * PUT /api/admin/products/:id
 * Update product
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new ApiError(404, "Product not found");

    const {
      name,
      slug,
      sku,
      category,
      brand,
      description,
      price,
      discountPercent,
      stock,
      lowStockThreshold,
      images,
      variants,
      specifications,
      status,
      featured,
      newArrival,
      bestSeller,
    } = req.body;

    if (name) product.name = name.trim();
    if (category) {
      const catDoc = await Category.findById(category);
      if (!catDoc) throw new ApiError(400, "Selected category does not exist");
      product.category = category;
    }
    if (price !== undefined) product.price = Math.max(0, Number(price));
    if (discountPercent !== undefined) {
      product.discountPercent = Math.max(0, Math.min(99, Number(discountPercent) || 0));
    }
    if (brand !== undefined) product.brand = brand.trim();
    if (description !== undefined) product.description = description.trim();
    if (lowStockThreshold !== undefined) {
      product.lowStockThreshold = Math.max(0, parseInt(lowStockThreshold, 10) || 5);
    }
    if (images !== undefined && Array.isArray(images)) product.images = images;
    if (variants !== undefined && Array.isArray(variants)) product.variants = variants;
    if (specifications !== undefined) {
      product.specifications = new Map(Object.entries(specifications || {}));
    }
    if (status && ["draft", "active"].includes(status)) product.status = status;
    if (featured !== undefined) product.featured = !!featured;
    if (newArrival !== undefined) product.newArrival = !!newArrival;
    if (bestSeller !== undefined) product.bestSeller = !!bestSeller;

    if (slug && slug !== product.slug) {
      const cleanSlug = slugify(slug);
      const existing = await Product.findOne({ slug: cleanSlug, _id: { $ne: product._id } });
      if (existing) throw new ApiError(400, `Slug '${cleanSlug}' is already in use`);
      product.slug = cleanSlug;
    }

    if (sku && sku !== product.sku) {
      const cleanSku = sku.trim();
      const existing = await Product.findOne({ sku: cleanSku, _id: { $ne: product._id } });
      if (existing) throw new ApiError(400, `SKU '${cleanSku}' is already in use`);
      product.sku = cleanSku;
    }

    // Handle direct stock updates
    if (stock !== undefined) {
      const newStock = Math.max(0, parseInt(stock, 10) || 0);
      const prevStock = product.stock;
      if (newStock !== prevStock) {
        const diff = newStock - prevStock;
        product.stock = newStock;
        await InvTransaction.create({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          previousStock: prevStock,
          change: diff,
          newStock: newStock,
          type: "MANUAL_ADJUSTMENT",
          reason: "Direct stock edit in product details",
          performedBy: req.admin?.name || "Admin",
        });
      }
    }

    await product.save();
    const populated = await Product.findById(product._id).populate("category", "name slug");

    res.json({
      success: true,
      product: serializeProduct(populated),
    });
  })
);

/**
 * PATCH /api/admin/products/:id/stock
 * Quick stock adjustment with audit transaction log
 */
router.patch(
  "/:id/stock",
  asyncHandler(async (req, res) => {
    const { change, type = "RESTOCK", reason = "" } = req.body;

    const delta = parseInt(change, 10);
    if (isNaN(delta) || delta === 0) {
      throw new ApiError(400, "Valid stock change amount is required (positive or negative integer)");
    }

    const validTypes = ["RESTOCK", "MANUAL_ADJUSTMENT", "DAMAGED", "RETURN", "CANCELLED_ORDER"];
    if (!validTypes.includes(type)) {
      throw new ApiError(400, `Type must be one of: ${validTypes.join(", ")}`);
    }

    const product = await Product.findById(req.params.id);
    if (!product) throw new ApiError(404, "Product not found");

    const previousStock = product.stock;
    const newStock = Math.max(0, previousStock + delta);
    const actualChange = newStock - previousStock;

    if (actualChange === 0) {
      throw new ApiError(400, "Stock cannot be negative or unchanged");
    }

    product.stock = newStock;
    await product.save();

    const transaction = await InvTransaction.create({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      previousStock,
      change: actualChange,
      newStock,
      type,
      reason: reason?.trim() || `Stock adjusted via admin panel (${type})`,
      performedBy: req.admin?.name || "Admin",
    });

    res.json({
      success: true,
      message: `Stock adjusted by ${actualChange > 0 ? `+${actualChange}` : actualChange}`,
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        available: product.available(),
      },
      transaction,
    });
  })
);

/**
 * DELETE /api/admin/products/:id
 * Delete product
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new ApiError(404, "Product not found");

    await Product.deleteOne({ _id: product._id });

    res.json({
      success: true,
      message: `Product '${product.name}' deleted successfully`,
    });
  })
);

module.exports = router;
