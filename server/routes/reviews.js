const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Review = require("../models/Review");
const { protect } = require("../middleware/auth");
const { ApiError, asyncHandler } = require("../utils/apiError");

const router = express.Router();

/** Public: GET /api/reviews/product/:id — approved reviews for a product. */
router.get(
  "/product/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid product id");
    const reviews = await Review.find({ product: id, status: "approved" })
      .sort({ createdAt: -1 })
      .limit(50);
    const agg = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(id), status: "approved" } },
      { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: "$rating" } } },
    ]);
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const starAgg = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(id), status: "approved" } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]);
    starAgg.forEach((s) => {
      if (breakdown[s._id] !== undefined) breakdown[s._id] = s.count;
    });
    res.json({
      success: true,
      reviews: reviews.map((r) => ({
        id: r._id,
        rating: r.rating,
        comment: r.comment,
        customerName: r.customerName || "Customer",
        createdAt: r.createdAt,
      })),
      summary: {
        count: agg[0]?.count || 0,
        avg: agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0,
        breakdown,
      },
    });
  })
);

// Everything below requires a logged-in customer
router.use(protect);

/** GET /api/reviews/mine — all reviews by the logged-in customer. */
router.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({ customer: req.customer._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      reviews: reviews.map((r) => ({
        id: r._id,
        product: r.product,
        productName: r.productName,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  })
);

/** GET /api/reviews/eligible — products from delivered orders not yet reviewed. */
router.get(
  "/eligible",
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ customer: req.customer._id, orderStatus: "delivered" }).select("items");
    const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.product?.toString())).filter(Boolean))];
    if (productIds.length === 0) return res.json({ success: true, products: [] });
    const reviewed = await Review.find({
      customer: req.customer._id,
      product: { $in: productIds },
    }).distinct("product");
    const remaining = productIds.filter((id) => !reviewed.includes(id));
    const eligible = await Order.aggregate([
      { $match: { customer: req.customer._id, orderStatus: "delivered" } },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: remaining.map((r) => new mongoose.Types.ObjectId(r)) } } },
      { $group: { _id: "$items.product", name: { $first: "$items.name" }, image: { $first: "$items.image" } } },
      { $limit: 50 },
    ]);
    res.json({
      success: true,
      products: eligible.map((e) => ({ id: e._id, name: e.name, image: e.image || "" })),
    });
  })
);

/** GET /api/reviews/can-review/:productId — eligibility check for the write-review button. */
router.get(
  "/can-review/:productId",
  asyncHandler(async (req, res) => {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) throw new ApiError(400, "Invalid product id");
    const delivered = await Order.exists({
      customer: req.customer._id,
      orderStatus: "delivered",
      "items.product": productId,
    });
    const existing = await Review.findOne({ product: productId, customer: req.customer._id }).select("status");
    res.json({
      success: true,
      canReview: !!delivered && !existing,
      reason: !delivered ? "purchase_required" : existing ? "already_reviewed" : null,
      existingStatus: existing?.status || null,
    });
  })
);

/** POST /api/reviews — submit a review (customer must have a delivered order with the product). */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { productId, rating, comment } = req.body;
    if (!mongoose.isValidObjectId(productId || "")) throw new ApiError(400, "Product is required");
    const rate = Number(rating);
    if (!Number.isInteger(rate) || rate < 1 || rate > 5) throw new ApiError(400, "Rating must be 1–5");
    const text = (comment || "").trim();
    if (text.length > 2000) throw new ApiError(400, "Comment is too long (max 2000 characters)");

    const delivered = await Order.exists({
      customer: req.customer._id,
      orderStatus: "delivered",
      "items.product": productId,
    });
    if (!delivered) throw new ApiError(403, "You can only review products you have purchased and received.");

    const existing = await Review.findOne({ product: productId, customer: req.customer._id });
    if (existing) throw new ApiError(400, "You have already reviewed this product.");

    const product = await mongoose.model("Product").findById(productId).select("name");
    if (!product) throw new ApiError(404, "Product not found");

    const review = await Review.create({
      product: productId,
      customer: req.customer._id,
      customerName: req.customer.name || "Customer",
      productName: product.name,
      order: delivered._id,
      rating: rate,
      comment: text,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Review submitted. It will appear publicly once approved by our team.",
      review: { id: review._id, status: review.status },
    });
  })
);

/** DELETE /api/reviews/:id — customer deletes their own pending review. */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const review = await Review.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!review) throw new ApiError(404, "Review not found");
    if (review.status !== "pending") throw new ApiError(400, "Only pending reviews can be deleted");
    const productId = review.product;
    await review.deleteOne();
    await Review.recalculateForProduct(productId);
    res.json({ success: true, message: "Review deleted" });
  })
);

module.exports = router;
