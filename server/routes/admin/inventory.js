const express = require("express");
const InvTransaction = require("../../models/InventoryTransaction");
const Product = require("../../models/Product");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { ApiError, asyncHandler } = require("../../utils/apiError");

const router = express.Router();
router.use(adminProtect);

router.use("/", requirePermission("inventory"));

/**
 * GET /api/admin/inventory
 * All products with stock info, search, low-stock/out-of-stock counts
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (search && search.trim()) {
      const re = new RegExp(search.trim(), "i");
      query.$or = [{ name: re }, { sku: re }];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, parseInt(limit) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [totalProducts, lowStockCount, outOfStockCount, products] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({
        $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] },
      }),
      Product.countDocuments({ stock: { $lte: 0 } }),
      Product.find(query)
        .populate("category", "name")
        .sort({ stock: 1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    res.json({
      success: true,
      totalProducts,
      lowStockCount,
      outOfStockCount,
      products: products.map((p) => ({
        _id: p._id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        reservedStock: p.reservedStock || 0,
        lowStockThreshold: p.lowStockThreshold,
        images: p.images || [],
        category: p.category,
      })),
    });
  })
);

/**
 * GET /api/admin/inventory/:productId/history
 * Stock transaction history for a specific product
 */
router.get(
  "/:productId/history",
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, parseInt(limit) || 30);

    const transactions = await InvTransaction.find({ product: req.params.productId })
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({ success: true, transactions });
  })
);

/**
 * POST /api/admin/inventory/:productId/adjust
 * Adjust stock: type = add | remove | set
 */
router.post(
  "/:productId/adjust",
  asyncHandler(async (req, res) => {
    const { type, quantity, reason, notes } = req.body;

    if (!["add", "remove", "set"].includes(type)) {
      throw new ApiError(400, "type must be add, remove, or set");
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 0) throw new ApiError(400, "quantity must be a positive number");

    const product = await Product.findById(req.params.productId);
    if (!product) throw new ApiError(404, "Product not found");

    const previousStock = product.stock;
    let change;

    if (type === "add") {
      product.stock += qty;
      change = qty;
    } else if (type === "remove") {
      if (product.stock - qty < 0) throw new ApiError(400, "Cannot reduce stock below 0");
      product.stock -= qty;
      change = -qty;
    } else if (type === "set") {
      change = qty - product.stock;
      product.stock = qty;
    }

    await product.save();

    // Record the transaction
    await InvTransaction.create({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      previousStock,
      change,
      newStock: product.stock,
      type: reason?.toUpperCase() || "MANUAL_ADJUSTMENT",
      reason: reason || "manual_adjustment",
      notes,
      performedBy: req.admin._id,
    });

    res.json({
      success: true,
      message: "Stock adjusted successfully",
      stock: product.stock,
    });
  })
);

/**
 * GET /api/admin/inventory/transactions
 * List inventory audit logs with filters and pagination
 */
router.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const { product, type, startDate, endDate, page = 1, limit = 25 } = req.query;

    const query = {};
    if (product) query.product = product;
    if (type) query.type = type.toUpperCase();
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [total, transactions] = await Promise.all([
      InvTransaction.countDocuments(query),
      InvTransaction.find(query)
        .populate("product", "name sku images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    res.json({
      success: true,
      transactions: transactions.map((t) => ({
        id: t._id,
        productId: t.product?._id || t.product,
        productName: t.product?.name || t.productName,
        sku: t.product?.sku || t.sku,
        image: t.product?.images?.[0] || "",
        previousStock: t.previousStock,
        change: t.change,
        newStock: t.newStock,
        type: t.type,
        reason: t.reason,
        performedBy: t.performedBy,
        createdAt: t.createdAt,
      })),
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
 * GET /api/admin/inventory/alerts
 * Products at or below low stock threshold
 */
router.get(
  "/alerts",
  asyncHandler(async (req, res) => {
    const products = await Product.find({
      $expr: { $lte: ["$stock", "$lowStockThreshold"] },
    })
      .populate("category", "name slug")
      .sort({ stock: 1 });

    res.json({
      success: true,
      alerts: products.map((p) => ({
        id: p._id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        stock: p.stock,
        reservedStock: p.reservedStock || 0,
        lowStockThreshold: p.lowStockThreshold,
        price: p.price,
        image: p.images?.[0] || "",
        category: p.category?.name || "Uncategorized",
        isOutOfStock: p.stock <= 0,
      })),
    });
  })
);

module.exports = router;
