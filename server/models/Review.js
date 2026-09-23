const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    // Snapshots so reviews survive product/customer renames in the admin list
    customerName: { type: String, trim: true },
    productName: { type: String, trim: true },
    moderatedBy: { type: String, trim: true },
    moderatedAt: { type: Date },
    // Set false only for seed/demo reviews; uniqueness applies to real purchase-verified reviews
    verifiedPurchase: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One verified-purchase review per customer per product
reviewSchema.index(
  { product: 1, customer: 1 },
  { unique: true, partialFilterExpression: { verifiedPurchase: true } }
);

/** Recompute ratingAvg / ratingCount on the product from its approved reviews. */
reviewSchema.statics.recalculateForProduct = async function (productId) {
  const agg = await this.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
        status: "approved",
      },
    },
    {
      $group: {
        _id: "$product",
        ratingCount: { $sum: 1 },
        ratingAvg: { $avg: "$rating" },
      },
    },
  ]);
  const Product = mongoose.model("Product");
  await Product.findByIdAndUpdate(productId, {
    ratingCount: agg[0]?.ratingCount || 0,
    ratingAvg: agg[0] ? Math.round(agg[0].ratingAvg * 10) / 10 : 0,
  });
};

module.exports = mongoose.model("Review", reviewSchema);
