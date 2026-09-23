const express = require("express");
const Review = require("../../models/Review");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { ApiError, asyncHandler } = require("../../utils/apiError");

const router = express.Router();
router.use(adminProtect);

router.use("/", requirePermission("reviews"));

/** GET /api/admin/reviews?status=&page=&limit= — moderation list. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20, search } = req.query;
    const q = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) q.status = status;
    if (search) {
      const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ productName: rx }, { customerName: rx }, { comment: rx }];
    }
    const lim = Math.min(Number(limit) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * lim;

    const [reviews, total, counts] = await Promise.all([
      Review.find(q).sort({ createdAt: -1 }).skip(skip).limit(lim),
      Review.countDocuments(q),
      Review.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const statusCounts = { pending: 0, approved: 0, rejected: 0 };
    counts.forEach((c) => {
      if (statusCounts[c._id] !== undefined) statusCounts[c._id] = c.count;
    });

    res.json({
      success: true,
      reviews: reviews.map((r) => ({
        id: r._id,
        productId: r.product,
        productName: r.productName,
        customerId: r.customer,
        customerName: r.customerName,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        moderatedBy: r.moderatedBy,
        moderatedAt: r.moderatedAt,
        createdAt: r.createdAt,
      })),
      total,
      page: Number(page) || 1,
      pages: Math.ceil(total / lim),
      statusCounts,
    });
  })
);

/** PATCH /api/admin/reviews/:id/status — approve or reject. */
router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) throw new ApiError(400, "Invalid status");
    const review = await Review.findById(req.params.id);
    if (!review) throw new ApiError(404, "Review not found");
    review.status = status;
    review.moderatedBy = req.admin.name || "Admin";
    review.moderatedAt = new Date();
    await review.save();
    await Review.recalculateForProduct(review.product);
    res.json({ success: true, message: `Review ${status}`, status: review.status });
  })
);

/** DELETE /api/admin/reviews/:id — remove a review entirely. */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw new ApiError(404, "Review not found");
    const productId = review.product;
    await review.deleteOne();
    await Review.recalculateForProduct(productId);
    res.json({ success: true, message: "Review deleted" });
  })
);

module.exports = router;
