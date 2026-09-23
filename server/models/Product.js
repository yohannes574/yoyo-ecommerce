const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Variant name is required"], trim: true },
    sku: { type: String, trim: true },
    price: { type: Number, min: 0 }, // null/absent → inherits product price
    stock: { type: Number, min: 0, default: 0 },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Product name is required"], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    brand: { type: String, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: [true, "Price is required"], min: 0 },
    discountPercent: { type: Number, min: 0, max: 99, default: 0 },
    stock: { type: Number, min: 0, default: 0 },
    reserved: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    images: [{ type: String }],
    variants: [variantSchema],
    specifications: { type: Map, of: String, default: {} },
    status: { type: String, enum: ["draft", "active"], default: "draft" },
    ratingAvg: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },
    featured: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/** Selling price after discount. */
productSchema.methods.salePrice = function () {
  return this.discountPercent > 0
    ? Math.round(this.price * (1 - this.discountPercent / 100))
    : this.price;
};

/** Stock available for new orders. */
productSchema.methods.available = function () {
  return Math.max(0, this.stock - this.reserved);
};

productSchema.methods.isLowStock = function () {
  return this.stock > 0 && this.stock <= this.lowStockThreshold;
};

productSchema.methods.isOutOfStock = function () {
  return this.stock <= 0;
};

module.exports = mongoose.model("Product", productSchema);