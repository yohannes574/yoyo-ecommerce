const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    productName: { type: String, trim: true },
    sku: { type: String, trim: true },
    previousStock: { type: Number, required: true },
    change: { type: Number, required: true },
    newStock: { type: Number, required: true },
    type: {
      type: String,
      enum: [
        "RESTOCK",
        "SALE",
        "RETURN",
        "MANUAL_ADJUSTMENT",
        "DAMAGED",
        "CANCELLED_ORDER",
      ],
      required: true,
    },
    reason: { type: String, trim: true },
    performedBy: { type: String, trim: true }, // admin name or "SYSTEM"
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryTransaction", inventoryTransactionSchema);