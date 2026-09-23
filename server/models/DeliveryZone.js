const mongoose = require("mongoose");

const deliveryZoneSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true, index: true },
    subCity: { type: String, required: true, trim: true },
    zone: { type: String, trim: true }, // optional human label, e.g. "Central Addis"
    standardFee: { type: Number, required: true, min: 0, default: 100 },
    expressFee: { type: Number, min: 0, default: 250 },
    etaDays: { type: String, trim: true, default: "2–3" }, // e.g. "2–3", "1", "4–7"
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

deliveryZoneSchema.index({ city: 1, subCity: 1 }, { unique: true });

module.exports = mongoose.model("DeliveryZone", deliveryZoneSchema);
