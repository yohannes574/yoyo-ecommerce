const express = require("express");
const Return = require("../../models/Return");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const InventoryTransaction = require("../../models/InventoryTransaction");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { ApiError, asyncHandler } = require("../../utils/apiError");
const { createCustomerNotification } = require("../../utils/notifications");

const router = express.Router();
router.use(adminProtect);

router.use("/", requirePermission("returns"));

/** GET /api/admin/returns?status=&page= — returns list with status tabs. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const q = {};
    if (status && ["requested", "approved", "rejected", "received", "refunded", "cancelled"].includes(status))
      q.status = status;
    const lim = Math.min(Number(limit) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * lim;

    const [returns, total, counts] = await Promise.all([
      Return.find(q).sort({ createdAt: -1 }).skip(skip).limit(lim),
      Return.countDocuments(q),
      Return.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const statusCounts = {};
    ["requested", "approved", "rejected", "received", "refunded", "cancelled"].forEach((s) => {
      statusCounts[s] = 0;
    });
    counts.forEach((c) => {
      if (statusCounts[c._id] !== undefined) statusCounts[c._id] = c.count;
    });

    res.json({
      success: true,
      returns: returns.map((r) => ({
        id: r._id,
        returnNumber: r.returnNumber,
        orderNumber: r.orderNumber,
        customerName: r.customerName || undefined,
        items: r.items,
        reason: r.reason,
        refundAmount: r.refundAmount,
        status: r.status,
        createdAt: r.createdAt,
      })),
      total,
      page: Number(page) || 1,
      pages: Math.ceil(total / lim),
      statusCounts,
    });
  })
);

/** GET /api/admin/returns/:id — full detail incl. customer + order info. */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const r = await Return.findById(req.params.id).populate("customer", "name email phone");
    if (!r) throw new ApiError(404, "Return not found");
    const order = await Order.findById(r.order).select("orderNumber total payment deliveryMethod address");
    res.json({
      success: true,
      return: {
        id: r._id,
        returnNumber: r.returnNumber,
        orderNumber: r.orderNumber,
        customer: r.customer
          ? { id: r.customer._id, name: r.customer.name, email: r.customer.email, phone: r.customer.phone }
          : null,
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
        order: order
          ? {
              id: order._id,
              total: order.total,
              paymentMethod: order.payment?.method,
              paymentStatus: order.payment?.status,
              deliveryMethod: order.deliveryMethod,
            }
          : null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      },
    });
  })
);

/**
 * PATCH /api/admin/returns/:id/status
 * Body: { status, note?, restock? }
 * allowed: approved | rejected | received | refunded
 * - refunded: flips the order payment status to "refunded" flow (rejected payment) & restocks items.
 */
router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status, note, restock } = req.body;
    if (!["approved", "rejected", "received", "refunded"].includes(status))
      throw new ApiError(400, "Invalid status");

    const r = await Return.findById(req.params.id);
    if (!r) throw new ApiError(404, "Return not found");

    const flow = { requested: ["approved", "rejected"], approved: ["received", "rejected"], received: ["refunded"] };
    const allowed = flow[r.status] || [];
    if (!allowed.includes(status))
      throw new ApiError(400, `Cannot move a ${r.status} return to ${status}. Allowed: ${allowed.join(", ")}`);

    r.status = status;
    if (note !== undefined) r.adminNote = String(note).trim();
    r.addEvent(status, note || `Return ${status} by admin`, req.admin.name || "Admin");

    if (status === "refunded") {
      // Flip the order payment to refunded-equivalent state and restock items
      await Order.updateOne({ _id: r.order }, { $set: { "payment.status": "rejected" } });

      const restockItems = restock !== false;
      if (restockItems) {
        for (const item of r.items) {
          if (!item.product) continue;
          const product = await Product.findById(item.product);
          if (!product) continue;
          if (item.variantName) {
            const variant = product.variants?.find((v) => v.name === item.variantName);
            if (variant) {
              variant.stock = (variant.stock || 0) + item.qty;
            } else {
              product.stock = (product.stock || 0) + item.qty;
            }
          } else {
            product.stock = (product.stock || 0) + item.qty;
          }
          product.reserved = Math.max(0, (product.reserved || 0) - item.qty);
          await product.save();
          await InventoryTransaction.create({
            product: product._id,
            productName: product.name,
            sku: product.sku,
            previousStock: 0,
            change: item.qty,
            newStock: product.stock,
            type: "RETURN",
            reason: `Return ${r.returnNumber} — ${item.variantName || "standard"}`,
            performedBy: req.admin.name || "Admin",
          });
        }
      }
    }

    await r.save();

    // Notify the customer
    await createCustomerNotification({
      customerId: r.customer,
      type: "return_update",
      title: `Return ${r.returnNumber} ${status}`,
      body:
        status === "approved"
          ? "Your return request was approved. Please prepare the items for pickup/drop-off."
          : status === "rejected"
            ? `Your return request was rejected.${r.adminNote ? ` Reason: ${r.adminNote}` : ""}`
            : status === "received"
              ? "We received your returned items. Your refund is being processed."
              : `Your refund of ${r.refundAmount} ETB has been processed.`,
      link: `/account/orders/${r.order}`,
    });

    res.json({ success: true, message: `Return ${status}`, status: r.status });
  })
);

module.exports = router;
