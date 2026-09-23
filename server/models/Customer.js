const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Full name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verificationCodeHash: { type: String },
    verificationCodeExpires: { type: Date },
    resetCodeHash: { type: String },
    resetCodeExpires: { type: Date },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true }
);

customerSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    verified: this.verified,
    status: this.status,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("Customer", customerSchema);