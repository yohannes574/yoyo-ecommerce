const express = require("express");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const Category = require("../models/Category");
const { ApiError, asyncHandler } = require("../utils/apiError");
const { serializeProduct } = require("../utils/serialize");

const router = express.Router();

const escapeRegex = (s) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  featured: { featured: -1, createdAt: -1 },
  new_arrivals: { newArrival: -1, createdAt: -1 },
  best_selling: { bestSeller: -1, createdAt: -1 },
};

/**
 * Expand a category by slug or ID.
 *
 * Includes:
 * - The selected parent category
 * - All active direct subcategories
 */
async function expandCategoryIds(selector) {
  const looksLikeId = mongoose.isValidObjectId(selector);

  const top = looksLikeId
    ? await Category.findOne({
        $or: [{ slug: selector }, { _id: selector }],
        active: true,
      })
    : await Category.findOne({
        slug: selector,
        active: true,
      });

  if (!top) {
    throw new ApiError(404, "Category not found");
  }

  const children = await Category.find({
    parent: top._id,
    active: true,
  }).select("_id");

  return [
    top._id,
    ...children.map((category) => category._id),
  ];
}

/**
 * GET /api/products
 *
 * Query parameters:
 * search=
 * category=
 * minPrice=
 * maxPrice=
 * inStock=
 * sort=
 * page=
 * limit=
 */
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

    // Only show active products to customers
    const query = {
      status: "active",
    };

    // Search products
    if (search && String(search).trim()) {
      const rx = new RegExp(
        escapeRegex(String(search).trim()),
        "i"
      );

      query.$or = [
        { name: rx },
        { description: rx },
        { brand: rx },
      ];
    }

    // Filter by category and its active subcategories
    if (category) {
      const ids = await expandCategoryIds(String(category));
      query.category = {
        $in: ids,
      };
    }

    // Price filtering
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};

      if (minPrice !== undefined) {
        query.price.$gte = Number(minPrice) || 0;
      }

      if (maxPrice !== undefined) {
        query.price.$lte = Number(maxPrice) || 0;
      }
    }

    // Only products with available stock
    if (inStock === "true") {
      query.$expr = {
        $gt: [
          {
            $subtract: [
              "$stock",
              "$reserved",
            ],
          },
          0,
        ],
      };
    }

    // Pagination
    const perPage = Math.min(
      Math.max(Number(limit) || 24, 1),
      48
    );

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const skip = (currentPage - 1) * perPage;

    // Sorting
    const sortBy =
      SORT_OPTIONS[sort] ||
      SORT_OPTIONS.newest;

    // Get total + products
    const [total, products] = await Promise.all([
      Product.countDocuments(query),

      Product.find(query)
        .populate("category", "name slug")
        .sort(sortBy)
        .skip(skip)
        .limit(perPage),
    ]);

    res.json({
      success: true,
      products: products.map(serializeProduct),
      total,
      page: currentPage,
      pages: Math.max(
        1,
        Math.ceil(total / perPage)
      ),
    });
  })
);

/**
 * GET /api/products/:slug
 *
 * Returns:
 * - Product details
 * - Related products
 */
router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({
      slug: req.params.slug,
      status: "active",
    }).populate(
      "category",
      "name slug"
    );

    if (!product) {
      throw new ApiError(
        404,
        "Product not found"
      );
    }

    // Find related products
    const related = await Product.find({
      category: product.category._id,
      _id: {
        $ne: product._id,
      },
      status: "active",
    })
      .populate(
        "category",
        "name slug"
      )
      .limit(8);

    res.json({
      success: true,
      product: serializeProduct(product),
      related: related.map(
        serializeProduct
      ),
    });
  })
);

module.exports = router;

