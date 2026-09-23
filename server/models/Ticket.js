const mongoose = require("mongoose");
const Counter = require("./Counter");

const ticketMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ["customer", "admin"], required: true },
    senderName: { type: String, trim: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    attachment: { type: String }, // uploaded file URL
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    customerName: { type: String, trim: true },
    customerEmail: { type: String, trim: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    orderNumber: { type: String, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    category: {
      type: String,
      enum: ["orders", "payments", "delivery", "returns", "product", "account", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "waiting_customer", "resolved", "closed"],
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    assignedTo: { type: String, trim: true },
    messages: { type: [ticketMessageSchema], default: [] },
  },
  { timestamps: true }
);

ticketSchema.statics.nextTicketNumber = async function () {
  const value = await Counter.increment("ticket");
  return `TCK-${100000 + value}`;
};

module.exports = mongoose.model("Ticket", ticketSchema);
