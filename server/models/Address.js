const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    label: { type: String, default: "Home", trim: true },
    fullName: { type: String, required: [true, "Full name is required"], trim: true },
    phone: { type: String, required: [true, "Phone is required"], trim: true },
    region: { type: String, required: [true, "Region is required"], trim: true },
    city: { type: String, required: [true, "City is required"], trim: true },
    subCity: { type: String, trim: true },
    woreda: { type: String, trim: true },
    address: { type: String, required: [true, "Specific address is required"], trim: true },
    deliveryInstructions: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Address", addressSchema);