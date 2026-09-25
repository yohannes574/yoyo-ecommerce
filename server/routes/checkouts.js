const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const PromoCode = require("../models/PromoCode");
const Address = require("../models/Address");
const InvTransaction = require("../models/InventoryTransaction");
const { protect } = require("../middleware/auth");
const { uploadReceipt } = require("../middleware/upload");
const { ApiError, asyncHandler } = require("../utils/apiError");
const { DELIVERY_FEE, validatePromo } = require("../utils/orders");
const { deliveryFeeFor } = require("../utils/delivery");
const { createCustomerNotification, createAdminNotification } = require("../utils/notifications");
const { uploadBuffer } = require("../utils/cloudinaryUpload");
const router = express.Router();
router.use(protect);

/** POST /api/checkouts/upload-receipt — upload payment receipt */
router.post(
  "/upload-receipt",
  uploadReceipt.single("receipt"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "No receipt file uploaded");
    }

    const result = await uploadBuffer(
      req.file.buffer,
      "yoyo-ecommerce/receipts"
    );

    res.json({
      success: true,
      url: result.secure_url,
    });
  })
);

/** POST /api/checkouts/validate-promo — check a promo code against cart subtotal */
router.post(
  "/validate-promo",
  asyncHandler(async (req, res) => {
    const { promoCode } = req.body;
    if (!promoCode || !promoCode.trim()) throw new ApiError(400, "Please enter a promo code");

    const code = promoCode.trim().toUpperCase();
    const promo = await PromoCode.findOne({ code, active: true });
    if (!promo) throw new ApiError(400, "Invalid or inactive promo code");

    const snapshot = await snapshotCart(req.customer._id);
    const subtotal = snapshot.reduce((s, line) => s + line.subtotal, 0);

    try {
      const result = await validatePromo(promo, subtotal);
      res.json({
        success: true,
        promo: {
          code: promo.code,
          type: promo.type,
          value: promo.value,
          discount: result.discount,
        },
      });
    } catch (err) {
      throw new ApiError(400, err.message || "Promo code could not be applied");
    }
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

const snapshotCart = async (customerId) => {
  const cart = await Cart.findOne({ customer: customerId }).populate("items.product");
  if (!cart || cart.items.length === 0) throw new ApiError(400, "Your cart is empty");

  return cart.items.map((item) => {
    const product = item.product;
    const variant = product?.variants?.find((v) => v.name === (item.variantName || ""));
    const selected = variant || {
      name: "Standard",
      sku: product?.sku || "",
      price: product?.price || 0,
      stock: product?.stock || 0,
    };
    const price = selected.price || product?.price || 0;
    const salePrice = product?.discountPercent ? Math.round(price * (1 - product.discountPercent / 100)) : price;
    const avail =
      variant
        ? Math.max(0, variant.stock)
        : Math.max(0, (product?.stock || 0) - (product?.reserved || 0));
    const qty = Math.max(1, Math.min(item.qty || 1, avail, 99));
    return {
      product: product?.id,
      name: product?.name || "Unknown product",
      sku: selected.sku || product?.sku || "",
      image: (product?.images && product.images[0]) || "",
      variantName: item.variantName || "",
      variantId: variant?.id || null,
      qty,
      price,
      salePrice,
      subtotal: Math.round(salePrice * qty),
      available: avail,
    };
  });
};

/** POST /api/checkouts — place an order from the cart. */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { addressId, deliveryMethod = "standard", promoCode, paymentMethod } = req.body;

    const cart = await Cart.findOne({ customer: req.customer._id }).populate("items.product");
    if (!cart || cart.items.length === 0) throw new ApiError(400, "Your cart is empty");

    // Address
    let address;
    if (addressId) {
      address = await Address.findOne({ _id: addressId, customer: req.customer._id });
      if (!address) throw new ApiError(404, "Address not found");
    } else {
      address = await Address.findOne({ customer: req.customer._id, isDefault: true });
      if (!address) throw new ApiError(400, "No default address found");
    }

    if (!["standard", "express"].includes(deliveryMethod)) throw new ApiError(400, "Invalid delivery method");

    const snapshot = await snapshotCart(req.customer._id);
    let subtotal = snapshot.reduce((s, line) => s + line.subtotal, 0);
    let discount = 0;
    let promoApplied = null;

    if (promoCode) {
      const code = (promoCode || "").toUpperCase().trim();
      if (!code) throw new ApiError(400, "Please enter a promo code");
      const promo = await PromoCode.findOne({ code, active: true });
      if (!promo) throw new ApiError(400, "Invalid or expired promo code");
      const result = await validatePromo(promo, subtotal);
      discount = result.discount;
      promoApplied = { code: promo.code, discount, type: promo.type, value: promo.value };
      promo.usedCount = (promo.usedCount || 0) + 1;
      await promo.save().catch(() => {});
    }

    const deliveryFee = await deliveryFeeFor(address, deliveryMethod, subtotal);
    const total = Math.round(subtotal - discount + deliveryFee);

    // Line items locked for the order
    const lineItems = snapshot.map((item) => ({
      product: item.product,
      name: item.name,
      sku: item.sku || "",
      image: item.image || "",
      variantName: item.variantName || "",
      price: item.salePrice,
      qty: item.qty,
      subtotal: item.subtotal,
    }));

    const orderNumber = await Order.nextOrderNumber();
    const paymentMethodFinal = paymentMethod || "cash_on_delivery";
    if (!["cash_on_delivery", "bank_transfer", "mobile"].includes(paymentMethodFinal)) {
      throw new ApiError(400, "Invalid payment method");
    }
    const paymentStatus =
      paymentMethodFinal === "bank_transfer" || paymentMethodFinal === "mobile"
        ? "pending_verification"
        : "cod_pending";

    // Reserve stock item-by-item so we can release only what we reserved if something fails mid-way
    const reserved = [];
    for (const li of lineItems) {
      const product = await Product.findById(li.product);
      if (!product) throw new ApiError(404, `Product not found: ${li.name}`);
      if (product.status !== "active") throw new ApiError(400, `${product.name} is no longer available`);

      const variant = product.variants?.find((v) => v.name === li.variantName);
      const available = variant
        ? Math.max(0, variant.stock)
        : Math.max(0, (product.stock || 0) - (product.reserved || 0));

      if (li.qty > available)
        throw new ApiError(400, `Only ${available} ${product.name} (${li.variantName}) available`);

      if (variant) {
        variant.stock = Math.max(0, variant.stock - li.qty);
        await product.save();
        reserved.push({ product, variant: undefined, variantName: li.variantName, qty: li.qty, variantFromDoc: variant });
      } else {
        product.reserved = (product.reserved || 0) + li.qty;
        await product.save();
        reserved.push({ product, variant: null, variantName: li.variantName, qty: li.qty });
      }
    }

    // Create order
    const order = await Order.create({
      orderNumber,
      customer: req.customer._id,
      items: lineItems,
      subtotal,
      discount,
      deliveryFee,
      total,
      address: {
        label: address.label,
        fullName: address.fullName,
        phone: address.phone,
        region: address.region,
        city: address.city,
        subCity: address.subCity,
        woreda: address.woreda,
        address: address.address,
        deliveryInstructions: address.deliveryInstructions || "",
      },
      deliveryMethod,
      promoCode: promoApplied?.code || null,
      payment: {
        method: paymentMethodFinal,
        status: paymentStatus,
        bank: req.body.bank || "",
        receiptUrl: req.body.receiptUrl || "",
      },
      timeline: [{ status: "pending", note: "Order placed", by: "System" }],
    });

    // Log inventory transactions
    for (const item of lineItems) {
      const product = await Product.findById(item.product).select("name sku stock");
      const inv = {
        product: item.product,
        productName: item.name,
        sku: item.sku || "",
        previousStock: 0,
        change: -item.qty,
        newStock: 0,
        type: "SALE",
        reason: `Order ${orderNumber} — ${item.variantName || "standard"}`,
        performedBy: "SYSTEM",
      };
      await InvTransaction.create(inv);
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Notifications: customer receipt + admin alert (non-blocking by design)
    await createCustomerNotification({
      customerId: req.customer._id,
      type: "order_update",
      title: `Order ${orderNumber} received`,
      body: "Your order has been received. We will confirm it shortly.",
      link: `/account/orders/${order._id}`,
    });
    await createAdminNotification({
      type: "new_order",
      area: "orders",
      title: `New order ${orderNumber}`,
      body: `${lineItems.length} item(s) — ${total.toLocaleString()} ETB (${paymentMethodFinal === "bank_transfer" ? "bank transfer, receipt pending" : paymentMethodFinal === "mobile" ? "mobile money" : "cash on delivery"})`,
      link: `/orders/${order._id}`,
    });

    res.status(201).json({
      success: true,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        orderStatusLabel: labelFor(order.orderStatus),
        createdAt: order.createdAt,
        items: order.items.map((it) => ({
          ...it.toObject(),
          subtotal: Math.round(it.subtotal),
        })),
        subtotal: Math.round(order.subtotal),
        discount: Math.round(order.discount),
        deliveryFee: Math.round(order.deliveryFee),
        total: Math.round(order.total),
        totalDisplay: order.total,
        address: order.address,
        deliveryMethod: order.deliveryMethod,
        promoCode: order.promoCode,
        payment: {
          method: order.payment.method,
          status: order.payment.status,
          paymentStatusLabel: paymentLabel(order.payment.method, order.payment.status),
          gatewayReference: order.payment.gatewayReference,
        },
        timeline: order.timeline.map((t) => ({ status: t.status, note: t.note, by: t.by, at: t.at })),
      },
    });
  })
);

/** POST /api/checkouts/:id/pay — COD / bank-transfer payment on a placed order. */
router.post(
  "/:id/pay",
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) throw new ApiError(404, "Order not found");

    if (["paid", "rejected", "failed"].includes(order.payment.status)) {
      throw new ApiError(400, "Payment already finalized for this order");
    }
    if (order.orderStatus === "cancelled") throw new ApiError(400, "This order was cancelled");

    const { method, bank, receiptUrl } = req.body;

    const finalMethod = method || order.payment.method;
    if (finalMethod !== "cash_on_delivery" && finalMethod !== "bank_transfer") {
      throw new ApiError(400, "Invalid payment method");
    }

    if (finalMethod === "cash_on_delivery") {
      order.payment.status = "cod_pending";
      order.timeline.push({ status: "cod_pending", note: "Cash on delivery selected", by: "Customer" });
    } else if (finalMethod === "bank_transfer") {
      if (!bank) throw new ApiError(400, "Bank name is required");
      order.payment.method = "bank_transfer";
      order.payment.bank = bank.trim();
      order.payment.receiptUrl = receiptUrl || null;
      order.payment.status = "pending_verification";
      order.timeline.push({
        status: "pending_verification",
        note: "Bank transfer selected. Awaiting receipt verification.",
        by: "Customer",
      });
    }

    await order.save();

    res.json({ success: true, order: cleanOrder(order) });
  })
);

/** GET /api/checkouts/:id — order detail for the customer */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) throw new ApiError(404, "Order not found");
    res.json({ success: true, order: cleanOrder(order) });
  })
);

/** POST /api/checkouts/:id/cancel — cancel pending/confirmed order */
router.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) throw new ApiError(404, "Order not found");

    if (!["pending", "confirmed"].includes(order.orderStatus)) {
      throw new ApiError(400, "This order cannot be cancelled at this stage");
    }

    const { cancelReason } = req.body;
    order.orderStatus = "cancelled";
    order.cancelReason = cancelReason?.trim() || "Cancelled by customer";
    order.timeline.push({ status: "cancelled", note: order.cancelReason, by: "Customer" });

    // Release reserved/deducted stock back
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      const variant = product.variants?.find((v) => v.name === item.variantName);
      if (variant) {
        variant.stock = Math.max(0, variant.stock + item.qty);
        await product.save();
      } else {
        product.reserved = Math.max(0, (product.reserved || 0) - item.qty);
        await product.save();
      }
    }

    await order.save();

    await createCustomerNotification({
      customerId: order.customer,
      type: "order_update",
      title: `Order ${order.orderNumber} cancelled`,
      body: "Your order was cancelled. Reserved items were released.",
      link: `/account/orders/${order._id}`,
    });
    await createAdminNotification({
      type: "order_update",
      area: "orders",
      title: `Order ${order.orderNumber} cancelled by customer`,
      body: order.cancelReason || "",
      link: `/orders/${order._id}`,
    });

    res.json({ success: true, order: cleanOrder(order) });
  })
);

/* ---------- helpers ---------- */

function cleanOrder(o) {
  return {
    id: o._id,
    orderNumber: o.orderNumber,
    status: o.orderStatus,
    orderStatusLabel: labelFor(o.orderStatus),
    createdAt: o.createdAt,
    items: o.items.map((it) => ({
      ...it.toObject(),
      subtotal: Math.round(it.subtotal),
    })),
    subtotal: Math.round(o.subtotal),
    discount: Math.round(o.discount),
    deliveryFee: Math.round(o.deliveryFee),
    total: Math.round(o.total),
    address: o.address,
    deliveryMethod: o.deliveryMethod,
    promoCode: o.promoCode,
    payment: {
      method: o.payment.method,
      status: o.payment.status,
      paymentStatusLabel: paymentLabel(o.payment.method, o.payment.status),
      bank: o.payment.bank,
      receiptUrl: o.payment.receiptUrl,
      verifiedBy: o.payment.verifiedBy,
      verifiedAt: o.payment.verifiedAt,
      notes: o.payment.notes,
    },
    cancelReason: o.cancelReason,
    canCancel: o.orderStatus === "pending" || o.orderStatus === "confirmed",
    canReturn: o.orderStatus === "delivered",
    timeline: o.timeline.map((t) => ({ status: t.status, note: t.note, by: t.by, at: t.at })),
  };
}

module.exports = router;