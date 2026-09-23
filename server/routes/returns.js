const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Return = require("../models/Return");
const { protect } = require("../middleware/auth");
const { uploadReceipt } = require("../middleware/upload");
const { ApiError, asyncHandler } = require("../utils/apiError");

const router = express.Router();
router.use(protect);

/** POST /api/returns/upload-evidence — upload a return evidence image. */
router.post(
  "/upload-evidence",
  uploadReceipt.single("evidence"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No image uploaded");
    res.json({
      success: true,
      url: `/uploads/receipts/${req.file.filename}`,
    });
  })
);

/** GET /api/returns — customer's own returns. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const returns = await Return.find({ customer: req.customer._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      returns: returns.map(serializeReturn),
    });
  })
);

/** GET /api/returns/:id — customer's own return detail. */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const ret = await Return.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!ret) throw new ApiError(404, "Return not found");
    res.json({ success: true, return: serializeReturn(ret) });
  })
);

/** POST /api/returns — request a return for a delivered order. */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { orderId, items, reason, description, evidence, refundMethod, refundAccount } = req.body;

    if (!mongoose.isValidObjectId(orderId || "")) throw new ApiError(400, "Order is required");
    const order = await Order.findOne({ _id: orderId, customer: req.customer._id });
    if (!order) throw new ApiError(404, "Order not found");
    if (order.orderStatus !== "delivered")
      throw new ApiError(400, "Only delivered orders can be returned");
    if (order.orderStatus === "cancelled") throw new ApiError(400, "Cancelled orders cannot be returned");

    const existing = await Return.findOne({ order: order._id, status: { $nin: ["rejected", "cancelled"] } });
    if (existing)
      throw new ApiError(400, `A return request already exists for order ${order.orderNumber} (${existing.status}).`);

    if (!reason || !String(reason).trim()) throw new ApiError(400, "Please provide a return reason");

    // Validate selected items against the order's line items
    const orderItems = order.items || [];
    let selected = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        const match = orderItems.find(
          (oi) => String(oi.product) === String(it.productId) && (oi.variantName || "") === (it.variantName || "")
        );
        if (!match) throw new ApiError(400, `Item not in this order: ${it.name || it.productId}`);
        const requestedQty = Math.max(1, Math.min(Number(it.qty) || 1, match.qty));
        selected.push({
          product: match.product,
          name: match.name,
          variantName: match.variantName || "",
          qty: requestedQty,
          price: match.price,
        });
      }
    } else {
      // Default: return everything
      selected = orderItems.map((oi) => ({
        product: oi.product,
        name: oi.name,
        variantName: oi.variantName || "",
        qty: oi.qty,
        price: oi.price,
      }));
    }

    const refundAmount = selected.reduce((s, it) => s + Math.round(it.price * it.qty), 0);

    const ret = await Return.create({
      returnNumber: await Return.nextReturnNumber(),
      order: order._id,
      orderNumber: order.orderNumber,
      customer: req.customer._id,
      items: selected,
      reason: String(reason).trim(),
      description: (description || "").trim(),
      evidence: Array.isArray(evidence) ? evidence.slice(0, 5) : [],
      refundMethod: ["bank_transfer", "mobile", "store_credit"].includes(refundMethod)
        ? refundMethod
        : "bank_transfer",
      refundAccount: (refundAccount || "").trim(),
      refundAmount,
      status: "requested",
      timeline: [{ status: "requested", note: "Return requested by customer", by: "Customer" }],
    });

    res.status(201).json({
      success: true,
      message: `Return request ${ret.returnNumber} submitted. We will review it shortly.`,
      return: serializeReturn(ret),
    });
  })
);

/** POST /api/returns/:id/cancel — customer cancels their own request while pending. */
router.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const ret = await Return.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!ret) throw new ApiError(404, "Return not found");
    if (!["requested", "approved"].includes(ret.status))
      throw new ApiError(400, "This return can no longer be cancelled");
    ret.status = "cancelled";
    ret.addEvent("cancelled", "Return cancelled by customer", "Customer");
    await ret.save();
    res.json({ success: true, message: "Return cancelled", return: serializeReturn(ret) });
  })
);

function serializeReturn(r) {
  return {
    id: r._id,
    returnNumber: r.returnNumber,
    orderId: r.order,
    orderNumber: r.orderNumber,
    items: r.items,
    reason: r.reason,
    description: r.description,
    evidence: r.evidence,
    refundMethod: r.refundMethod,
    refundAccount: r.refundAccount,
    refundAmount: r.refundAmount,
    status: r.status,
    adminNote: r.adminNote,
    timeline: r.timeline,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

module.exports = router;
