const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    audience: {
      type: String,
      enum: ["customer", "admin"],
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
    },
    // Optional area used by admin notification filtering/permissions
    area: {
      type: String,
      enum: [
        "orders",
        "payments",
        "inventory",
        "returns",
        "support",
        "customers",
        "system",
        null,
      ],
      default: null,
    },
    type: { type: String, trim: true, default: "system" },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true, default: "" },
    link: { type: String, trim: true, default: "" },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ audience: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
