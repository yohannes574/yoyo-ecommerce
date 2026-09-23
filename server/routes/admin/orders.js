const express = require("express");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const InvTransaction = require("../../models/InventoryTransaction");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { ApiError, asyncHandler } = require("../../utils/apiError");
const { createCustomerNotification, createAdminNotification } = require("../../utils/notifications");

const NOTIF_BODY = {
  confirmed: "Your order has been confirmed and is being prepared.",
  processing: "Your order is being prepared.",
  ready_for_delivery: "Your order is packed and ready for delivery.",
  out_for_delivery: "Your order is on the way.",
  delivered: "Your order has been delivered. How was your purchase? Rate it from the product page!",
  cancelled: "Your order was cancelled.",
};

const router = express.Router();
router.use(adminProtect);

router.use("/", requirePermission("orders"));
router.use("/:id/payment", requirePermission("payments"));

const labelForStatus = (status) => {
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

const labelForPayment = (method, status) => {
  const map = {
    cod_pending: "Cash on delivery (Pending)",
    pending_verification: "Receipt pending verification",
    paid: "Paid",
    failed: "Payment failed",
    rejected: "Receipt rejected",
  };
  return map[status] || status;
};

/**
 * GET /api/admin/orders
 * List orders with search, status filters, payment filters, and pagination
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      search,
      orderStatus,
      paymentStatus,
      deliveryMethod,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (orderStatus) {
      const validStatuses = [
        "pending",
        "confirmed",
        "processing",
        "ready_for_delivery",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ];
      if (validStatuses.includes(orderStatus.toLowerCase())) {
        query.orderStatus = orderStatus.toLowerCase();
      }
    }

    if (paymentStatus) {
      const validPayments = [
        "cod_pending",
        "pending_verification",
        "paid",
        "failed",
        "rejected",
      ];
      if (validPayments.includes(paymentStatus.toLowerCase())) {
        query["payment.status"] = paymentStatus.toLowerCase();
      }
    }

    if (deliveryMethod && ["standard", "express"].includes(deliveryMethod)) {
      query.deliveryMethod = deliveryMethod;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { orderNumber: { $regex: term, $options: "i" } },
        { "address.fullName": { $regex: term, $options: "i" } },
        { "address.phone": { $regex: term, $options: "i" } },
        { "address.city": { $regex: term, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, orders] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query)
        .populate("customer", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    const formatted = orders.map((o) => ({
      id: o._id,
      orderNumber: o.orderNumber,
      customer: o.customer
        ? { id: o.customer._id, name: o.customer.name, email: o.customer.email, phone: o.customer.phone }
        : { name: o.address?.fullName || "Guest", phone: o.address?.phone || "" },
      itemsCount: o.items.length,
      items: o.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        subtotal: i.subtotal,
        variantName: i.variantName,
      })),
      subtotal: o.subtotal,
      discount: o.discount || 0,
      deliveryFee: o.deliveryFee || 0,
      total: o.total,
      orderStatus: o.orderStatus,
      orderStatusLabel: labelForStatus(o.orderStatus),
      payment: {
        method: o.payment.method,
        status: o.payment.status,
        paymentStatusLabel: labelForPayment(o.payment.method, o.payment.status),
        bank: o.payment.bank,
        receiptUrl: o.payment.receiptUrl,
        verifiedBy: o.payment.verifiedBy,
        verifiedAt: o.payment.verifiedAt,
      },
      deliveryMethod: o.deliveryMethod,
      address: o.address,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));

    res.json({
      success: true,
      orders: formatted,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  })
);

/**
 * GET /api/admin/orders/:id
 * Full single order detail with timeline and verification data
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
      .populate("customer", "name email phone")
      .populate("items.product", "name sku stock price images");
    if (!order) throw new ApiError(404, "Order not found");

    res.json({
      success: true,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer
          ? {
              id: order.customer._id,
              name: order.customer.name,
              email: order.customer.email,
              phone: order.customer.phone,
            }
          : null,
        items: order.items,
        subtotal: order.subtotal,
        discount: order.discount,
        deliveryFee: order.deliveryFee,
        total: order.total,
        address: order.address,
        deliveryMethod: order.deliveryMethod,
        promoCode: order.promoCode,
        orderStatus: order.orderStatus,
        orderStatusLabel: labelForStatus(order.orderStatus),
        payment: {
          method: order.payment.method,
          status: order.payment.status,
          paymentStatusLabel: labelForPayment(order.payment.method, order.payment.status),
          bank: order.payment.bank,
          receiptUrl: order.payment.receiptUrl,
          verifiedBy: order.payment.verifiedBy,
          verifiedAt: order.payment.verifiedAt,
          notes: order.payment.notes,
        },
        cancelReason: order.cancelReason,
        timeline: order.timeline || [],
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  })
);

/**
 * PATCH /api/admin/orders/:id/status
 * Update order status along with status timeline event
 */
router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status, note, cancelReason } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "ready_for_delivery",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];

    if (!status || !validStatuses.includes(status)) {
      throw new ApiError(400, `Status must be one of: ${validStatuses.join(", ")}`);
    }

    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, "Order not found");

    const prevStatus = order.orderStatus;
    if (prevStatus === status) {
      return res.json({ success: true, message: "Order already in this status", order });
    }

    // If transitioning to cancelled from an uncancelled state, release or restore inventory
    if (status === "cancelled" && prevStatus !== "cancelled") {
      order.cancelReason = cancelReason?.trim() || note?.trim() || "Cancelled by admin";

      for (const item of order.items) {
        if (item.product) {
          const product = await Product.findById(item.product);
          if (product) {
            const prevStock = product.stock;
            // Restore reserved or stock based on order status
            if (["pending", "confirmed", "processing"].includes(prevStatus)) {
              product.reserved = Math.max(0, (product.reserved || 0) - item.qty);
            }
            product.stock += item.qty;
            await product.save();

            await InvTransaction.create({
              product: product._id,
              productName: product.name,
              sku: product.sku,
              previousStock: prevStock,
              change: item.qty,
              newStock: product.stock,
              type: "CANCELLED_ORDER",
              reason: `Order ${order.orderNumber} cancelled`,
              performedBy: req.admin?.name || "Admin",
            });
          }
        }
      }
    }

    // If order delivered and it was COD, auto-update payment to paid
    if (status === "delivered" && order.payment.method === "cash_on_delivery" && order.payment.status === "cod_pending") {
      order.payment.status = "paid";
      order.payment.verifiedBy = req.admin?.name || "Admin";
      order.payment.verifiedAt = new Date();
    }

    order.orderStatus = status;
    order.addTimelineEvent(
      status,
      note?.trim() || `Status updated from ${labelForStatus(prevStatus)} to ${labelForStatus(status)}`,
      req.admin?.name || "Admin"
    );

    await order.save();

    await createCustomerNotification({
      customerId: order.customer,
      type: "order_update",
      title: `Order ${order.orderNumber} ${labelForStatus(status)}`,
      body: NOTIF_BODY[status] || `Your order status changed to ${labelForStatus(status)}.`,
      link: `/account/orders/${order._id}`,
    });
    if (status === "pending" || prevStatus === "pending") {
      await createAdminNotification({
        type: "order_update",
        area: "orders",
        title: status === "delivered" ? `Order ${order.orderNumber} delivered` : `Order ${order.orderNumber} updated`,
        body: `Status: ${labelForStatus(status)}`,
        link: `/orders/${order._id}`,
      });
    }

    res.json({
      success: true,
      message: `Order status updated to ${labelForStatus(status)}`,
      orderStatus: order.orderStatus,
      orderStatusLabel: labelForStatus(order.orderStatus),
      timeline: order.timeline,
    });
  })
);

/**
 * PATCH /api/admin/orders/:id/payment
 * Verify or reject bank transfer receipts
 */
router.patch(
  "/:id/payment",
  asyncHandler(async (req, res) => {
    const { action, notes } = req.body; // action: "verify" | "reject" | "update", status: "paid" | "rejected" | ...

    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, "Order not found");

    if (action === "verify") {
      order.payment.status = "paid";
      order.payment.verifiedBy = req.admin?.name || "Admin";
      order.payment.verifiedAt = new Date();
      if (notes) order.payment.notes = notes.trim();

      // If order was pending, confirm it upon payment receipt verification
      if (order.orderStatus === "pending") {
        order.orderStatus = "confirmed";
        order.addTimelineEvent(
          "confirmed",
          `Payment receipt verified by ${req.admin?.name || "Admin"}. Order confirmed.`,
          req.admin?.name || "Admin"
        );
      } else {
        order.addTimelineEvent(
          order.orderStatus,
          `Payment receipt verified by ${req.admin?.name || "Admin"}.`,
          req.admin?.name || "Admin"
        );
      }
    } else if (action === "reject") {
      order.payment.status = "rejected";
      order.payment.notes = notes?.trim() || "Payment receipt could not be verified";
      order.addTimelineEvent(
        order.orderStatus,
        `Payment receipt rejected by ${req.admin?.name || "Admin"}. Reason: ${order.payment.notes}`,
        req.admin?.name || "Admin"
      );
    } else {
      const { status } = req.body;
      const validPayments = ["cod_pending", "pending_verification", "paid", "failed", "rejected"];
      if (!status || !validPayments.includes(status)) {
        throw new ApiError(400, `Payment status must be one of: ${validPayments.join(", ")}`);
      }
      order.payment.status = status;
      if (notes) order.payment.notes = notes.trim();
      order.addTimelineEvent(
        order.orderStatus,
        `Payment status updated to ${labelForPayment(order.payment.method, status)}`,
        req.admin?.name || "Admin"
      );
    }

    await order.save();

    await createCustomerNotification({
      customerId: order.customer,
      type: "payment_update",
      title: `Payment ${order.payment.status === "paid" ? "confirmed" : order.payment.status} — order ${order.orderNumber}`,
      body:
        order.payment.status === "paid"
          ? "Your payment has been confirmed. Thank you!"
          : order.payment.status === "rejected"
            ? `Your payment receipt was rejected.${order.payment.notes ? ` Reason: ${order.payment.notes}` : ""} You can upload a new receipt from the order page.`
            : `Payment status: ${labelForPayment(order.payment.method, order.payment.status)}.`,
      link: `/account/orders/${order._id}`,
    });

    res.json({
      success: true,
      message: "Order payment status updated successfully",
      payment: {
        method: order.payment.method,
        status: order.payment.status,
        paymentStatusLabel: labelForPayment(order.payment.method, order.payment.status),
        verifiedBy: order.payment.verifiedBy,
        verifiedAt: order.payment.verifiedAt,
        notes: order.payment.notes,
      },
      orderStatus: order.orderStatus,
      timeline: order.timeline,
    });
  })
);

module.exports = router;
