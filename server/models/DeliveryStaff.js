const mongoose = require("mongoose");

const deliveryStaffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    zone: { type: String, trim: true }, // primary zone label
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryStaff", deliveryStaffSchema);
