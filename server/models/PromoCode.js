const mongoose = require("mongoose");

const promoSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Promo code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["percent", "fixed"],
      required: [true, "Discount type is required"],
    },
    value: { type: Number, required: [true, "Discount value is required"], min: 0 },
    minOrder: { type: Number, min: 0, default: 0 },
    maxDiscount: { type: Number, min: 0, default: 0 }, // cap for percent discounts; 0 = none
    usageLimit: { type: Number, min: 0, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, min: 0, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    applicableProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
    applicableCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    ],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PromoCode", promoSchema);