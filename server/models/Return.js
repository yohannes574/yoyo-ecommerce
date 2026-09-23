const mongoose = require("mongoose");

const returnItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    variantName: { type: String, default: "" },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const returnEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String },
    by: { type: String, default: "System" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: { type: String, required: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    items: { type: [returnItemSchema], default: [] },
    reason: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    evidence: [{ type: String }], // uploaded image URLs
    refundMethod: {
      type: String,
      enum: ["bank_transfer", "mobile", "store_credit"],
      default: "bank_transfer",
    },
    refundAccount: { type: String, trim: true }, // bank / phone account for the refund
    status: {
      type: String,
      enum: [
        "requested",
        "approved",
        "rejected",
        "received",
        "refunded",
        "cancelled",
      ],
      default: "requested",
      index: true,
    },
    adminNote: { type: String, trim: true, default: "" },
    refundAmount: { type: Number, min: 0, default: 0 },
    timeline: { type: [returnEventSchema], default: [] },
  },
  { timestamps: true }
);

/** Allocate the next return number, e.g. RET-100001. */
returnSchema.statics.nextReturnNumber = async function () {
  const value = await Counter.increment("return");
  return `RET-${100000 + value}`;
};

/** Append an event to the return timeline. */
returnSchema.methods.addEvent = function (status, note, by = "System") {
  this.timeline.push({ status, note, by });
};

module.exports = mongoose.model("Return", returnSchema);
