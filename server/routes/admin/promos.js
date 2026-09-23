const express = require("express");
const PromoCode = require("../../models/PromoCode");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { ApiError, asyncHandler } = require("../../utils/apiError");

const router = express.Router();
router.use(adminProtect);

router.use("/", requirePermission("promos"));

/**
 * GET /api/admin/promos
 * List all promo codes
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const promos = await PromoCode.find()
      .populate("applicableProducts", "name sku")
      .populate("applicableCategories", "name slug")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      promos: promos.map((p) => ({
        id: p._id,
        code: p.code,
        type: p.type,
        value: p.value,
        minOrder: p.minOrder || 0,
        maxDiscount: p.maxDiscount || 0,
        usageLimit: p.usageLimit || 0,
        usedCount: p.usedCount || 0,
        startDate: p.startDate,
        endDate: p.endDate,
        active: p.active,
        isExpired: p.endDate ? new Date() > new Date(p.endDate) : false,
        applicableProducts: p.applicableProducts,
        applicableCategories: p.applicableCategories,
        createdAt: p.createdAt,
      })),
    });
  })
);

/**
 * GET /api/admin/promos/:id
 * Single promo detail
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const promo = await PromoCode.findById(req.params.id)
      .populate("applicableProducts", "name sku")
      .populate("applicableCategories", "name slug");
    if (!promo) throw new ApiError(404, "Promo code not found");

    res.json({
      success: true,
      promo,
    });
  })
);

/**
 * POST /api/admin/promos
 * Create a new promo code
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      code,
      type,
      value,
      minOrder = 0,
      maxDiscount = 0,
      usageLimit = 0,
      startDate,
      endDate,
      applicableProducts = [],
      applicableCategories = [],
      active = true,
    } = req.body;

    if (!code || !code.trim()) throw new ApiError(400, "Promo code is required");
    if (!["percent", "fixed"].includes(type)) {
      throw new ApiError(400, "Type must be either 'percent' or 'fixed'");
    }
    if (value === undefined || Number(value) <= 0) {
      throw new ApiError(400, "Discount value must be greater than 0");
    }
    if (type === "percent" && Number(value) > 100) {
      throw new ApiError(400, "Percentage discount cannot exceed 100%");
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await PromoCode.findOne({ code: cleanCode });
    if (existing) throw new ApiError(400, `Promo code '${cleanCode}' already exists`);

    const promo = await PromoCode.create({
      code: cleanCode,
      type,
      value: Number(value),
      minOrder: Math.max(0, Number(minOrder) || 0),
      maxDiscount: Math.max(0, Number(maxDiscount) || 0),
      usageLimit: Math.max(0, parseInt(usageLimit, 10) || 0),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      applicableProducts,
      applicableCategories,
      active: active !== false,
    });

    res.status(201).json({
      success: true,
      promo,
    });
  })
);

/**
 * PUT /api/admin/promos/:id
 * Update promo code
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) throw new ApiError(404, "Promo code not found");

    const {
      code,
      type,
      value,
      minOrder,
      maxDiscount,
      usageLimit,
      startDate,
      endDate,
      applicableProducts,
      applicableCategories,
      active,
    } = req.body;

    if (code && code.trim().toUpperCase() !== promo.code) {
      const cleanCode = code.trim().toUpperCase();
      const existing = await PromoCode.findOne({ code: cleanCode, _id: { $ne: promo._id } });
      if (existing) throw new ApiError(400, `Promo code '${cleanCode}' already exists`);
      promo.code = cleanCode;
    }

    if (type && ["percent", "fixed"].includes(type)) promo.type = type;
    if (value !== undefined) {
      const val = Number(value);
      if (val <= 0) throw new ApiError(400, "Discount value must be greater than 0");
      if (promo.type === "percent" && val > 100) throw new ApiError(400, "Percentage cannot exceed 100%");
      promo.value = val;
    }

    if (minOrder !== undefined) promo.minOrder = Math.max(0, Number(minOrder) || 0);
    if (maxDiscount !== undefined) promo.maxDiscount = Math.max(0, Number(maxDiscount) || 0);
    if (usageLimit !== undefined) promo.usageLimit = Math.max(0, parseInt(usageLimit, 10) || 0);
    if (startDate !== undefined) promo.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) promo.endDate = endDate ? new Date(endDate) : null;
    if (applicableProducts !== undefined) promo.applicableProducts = applicableProducts;
    if (applicableCategories !== undefined) promo.applicableCategories = applicableCategories;
    if (active !== undefined) promo.active = !!active;

    await promo.save();

    res.json({
      success: true,
      promo,
    });
  })
);

/**
 * PATCH /api/admin/promos/:id/toggle
 * Toggle active state
 */
router.patch(
  "/:id/toggle",
  asyncHandler(async (req, res) => {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) throw new ApiError(404, "Promo code not found");

    promo.active = !promo.active;
    await promo.save();

    res.json({
      success: true,
      message: `Promo code '${promo.code}' is now ${promo.active ? "active" : "inactive"}`,
      active: promo.active,
    });
  })
);

/**
 * DELETE /api/admin/promos/:id
 * Delete promo code
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) throw new ApiError(404, "Promo code not found");

    await PromoCode.deleteOne({ _id: promo._id });

    res.json({
      success: true,
      message: `Promo code '${promo.code}' deleted successfully`,
    });
  })
);

module.exports = router;
