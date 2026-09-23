const mongoose = require("mongoose");
const Counter = require("./Counter");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    image: { type: String },
    variantName: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    label: String,
    fullName: String,
    phone: String,
    region: String,
    city: String,
    subCity: String,
    woreda: String,
    address: String,
    deliveryInstructions: String,
  },
  { _id: false }
);

const timelineEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String },
    by: { type: String, default: "System" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    address: { type: addressSnapshotSchema, required: true },
    deliveryMethod: {
      type: String,
      enum: ["standard", "express"],
      default: "standard",
    },
    promoCode: { type: String, trim: true },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "ready_for_delivery",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    payment: {
      method: {
        type: String,
        enum: ["cash_on_delivery", "bank_transfer", "mobile"],
        required: true,
      },
      status: {
        type: String,
        enum: [
          "cod_pending",
          "pending_verification",
          "paid",
          "failed",
          "rejected",
        ],
        default: "cod_pending",
      },
      bank: { type: String, trim: true },
      receiptUrl: { type: String },
      gatewayProvider: { type: String, trim: true },
      gatewayReference: { type: String, trim: true, index: true },
      paidAt: { type: Date },
      verifiedBy: { type: String },
      verifiedAt: { type: Date },
      notes: { type: String },
    },
    cancelReason: { type: String, trim: true },
    deliveryStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryStaff",
      default: null,
      index: true,
    },
    timeline: [timelineEventSchema],
  },
  { timestamps: true }
);

/** Allocate the next order number, e.g. ORD-100001. */
orderSchema.statics.nextOrderNumber = async function () {
  const value = await Counter.increment("order");
  return `ORD-${100000 + value}`;
};

/** Append an event to the order timeline. */
orderSchema.methods.addTimelineEvent = function (status, note, by = "System") {
  this.timeline.push({ status, note, by });
};

module.exports = mongoose.model("Order", orderSchema);