const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { ApiError, asyncHandler } = require("../utils/apiError");
const { serializeProduct } = require("../utils/serialize");

const router = express.Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  featured: { featured: -1, createdAt: -1 },
  new_arrivals: { newArrival: -1, createdAt: -1 },
  best_selling: { bestSeller: -1, createdAt: -1 },
};

/** Expand a category (by slug or id) to include all active subcategory ids. */
async function expandCategoryIds(selector) {
  const looksLikeId = mongoose.isValidObjectId(selector);
  const top = looksLikeId
    ? await Category.findOne({ $or: [{ slug: selector }, { _id: selector }], active: true })
    : await Category.findOne({ slug: selector, active: true });
  if (!top) throw new ApiError(404, "Category not found");
  const children = await Category.find({ parent: top._id, active: true }).select("_id");
  return [top._id, ...children.map((c) => c._id)];
}

/** GET /api/products?search=&category=&minPrice=&maxPrice=&inStock=&sort=&page=&limit= */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
      sort,
      page = 1,
      limit = 24,
    } = req.query;

    const query = { status: "active" };

    if (search) {
      const rx = new RegExp(escapeRegex(String(search)), "i");
      query.$or = [{ name: rx }, { description: rx }, { brand: rx }];
    }

    if (category) {
      const ids = await expandCategoryIds(category);
      query.category = { $in: ids };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = Number(minPrice) || 0;
      if (maxPrice !== undefined) query.price.$lte = Number(maxPrice) || 0;
    }

    if (inStock === "true") {
      // Only products whose total stock exceeds reservations
      query.$expr = { $gt: [{ $subtract: ["$stock", "$reserved"] }, 0] };
    }

    const perPage = Math.min(Math.max(Number(limit) || 24, 1), 48);
    const currentPage = Math.max(Number(page) || 1, 1);
    const sortBy = SORT_OPTIONS[sort] || SORT_OPTIONS.newest;

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate("category", "name slug")
        .sort(sortBy)
        .skip((currentPage - 1) * perPage)
        .limit(perPage),
    ]);

    res.json({
      success: true,
      products: products.map(serializeProduct),
      total,
      page: currentPage,
      pages: Math.max(1, Math.ceil(total / perPage)),
    });
  })
);

/** GET /api/products/:slug — details + related products */
router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({
      slug: req.params.slug,
      status: "active",
    }).populate("category", "name slug");
    if (!product) throw new ApiError(404, "Product not found");

    const related = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      status: "active",
    })
      .populate("category", "name slug")
      .limit(8);

    res.json({ success: true, product: serializeProduct(product), related: related.map(serializeProduct) });
  })
);

module.exports = router;