const express = require("express");
const Order = require("../models/Order");
const { protect } = require("../middleware/auth");
const { asyncHandler } = require("../utils/apiError");

const router = express.Router();
router.use(protect);

const statusEnum = ["pending", "confirmed", "processing", "ready_for_delivery", "out_for_delivery", "delivered", "cancelled"];

/** GET /api/orders?status=pending */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status: statusFilter } = req.query;

    const where = { customer: req.customer._id };
    if (statusFilter && statusEnum.includes(statusFilter.toLowerCase())) {
      where.orderStatus = statusFilter.toLowerCase();
    }

    const orders = await Order.find(where).sort({ createdAt: -1 }).populate("customer", "name email phone");

    res.json({
      success: true,
      orders: orders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        status: o.orderStatus,
        orderStatusLabel: labelFor(o.orderStatus),
        payment: {
          method: o.payment.method,
          status: o.payment.status,
          paymentStatusLabel: paymentLabel(o.payment.method, o.payment.status),
        },
        itemsCount: o.items.length,
        total: o.total,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
    });
  })
);

/** GET /api/orders/:id — order details including timeline, snapshot of address, and payment info */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) throw new ApiError(404, "Order not found");

    res.json({
      success: true,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        orderStatusLabel: labelFor(order.orderStatus),
        createdAt: order.createdAt,
        items: order.items,
        subtotal: order.subtotal,
        discount: order.discount,
        deliveryFee: order.deliveryFee,
        total: order.total,
        address: order.address,
        deliveryMethod: order.deliveryMethod,
        promoCode: order.promoCode,
        payment: {
          method: order.payment.method,
          status: order.payment.status,
          paymentStatusLabel: paymentLabel(order.payment.method, order.payment.status),
          bank: order.payment.bank,
          receiptUrl: order.payment.receiptUrl,
          verifiedBy: order.payment.verifiedBy,
          verifiedAt: order.payment.verifiedAt,
          notes: order.payment.notes,
        },
        cancelReason: order.cancelReason,
        timeline: order.timeline.map((t) => ({
          status: t.status,
          note: t.note,
          by: t.by,
          at: t.at,
        })),
        canCancel: canCancelOrder(order),
      },
    });
  })
);

const labelFor = (status) => {
  const map = {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    ready_for_delivery: "Ready for delivery",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[status] || status;
};

const paymentLabel = (method, status) => {
  const map = {
    cod_pending: "Cash on delivery",
    pending_verification: "Awaiting receipt verification",
    paid: "Paid",
    failed: "Payment failed",
    rejected: "Payment rejected",
  };
  return map[status] || status;
};

const canCancelOrder = (order) => order.orderStatus === "pending" || order.orderStatus === "confirmed";

module.exports = router;