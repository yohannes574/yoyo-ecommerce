const express = require("express");
const Order = require("../models/Order");
const { protect } = require("../middleware/auth");
const { ApiError, asyncHandler } = require("../utils/apiError");
const {
  initializePayment,
  verifyPayment,
  verifyWebhookSignature,
  publicConfig,
} = require("../utils/paymentGateway");
const { createCustomerNotification, createAdminNotification } = require("../utils/notifications");

const router = express.Router();

/** GET /api/payments/config — public: is mobile money on, which providers, mock or live. */
router.get(
  "/config",
  asyncHandler(async (req, res) => {
    const cfg = await publicConfig();
    res.json({ success: true, ...cfg });
  })
);

/** POST /api/payments/init — start mobile-money checkout for one of the customer's orders. */
router.post(
  "/init",
  protect,
  asyncHandler(async (req, res) => {
    const { orderId, provider } = req.body;
    const order = await Order.findOne({ _id: orderId, customer: req.customer._id });
    if (!order) throw new ApiError(404, "Order not found");
    if (order.payment.method !== "mobile") throw new ApiError(400, "This order is not a mobile-money order");
    if (order.payment.status === "paid") throw new ApiError(400, "This order is already paid");
    if (order.orderStatus === "cancelled") throw new ApiError(400, "This order was cancelled");

    const nameParts = (order.address?.fullName || "Yoyo Customer").split(" ");
    const result = await initializePayment({
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.total,
      email: req.customer.email,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" ") || nameParts[0],
      phone: order.address?.phone || req.customer.phone || "",
      callbackUrl: `${process.env.PUBLIC_BASE_URL || "http://localhost:5173"}/order/${order._id}?payment=return`,
    });

    order.payment.gatewayReference = result.reference;
    order.payment.gatewayProvider = provider || "mobile";
    order.payment.status = "pending_verification";
    order.addTimelineEvent(
      order.orderStatus,
      result.mock
        ? `Mobile money payment initiated (mock): ${result.reference}`
        : `Mobile money payment initiated: ${result.reference}`,
      "System"
    );
    await order.save();

    res.json({ success: true, reference: result.reference, checkoutUrl: result.checkoutUrl, mock: result.mock });
  })
);

/** GET /api/payments/verify/:reference — verify + finalize (called on return from gateway). */
router.get(
  "/verify/:reference",
  protect,
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ "payment.gatewayReference": req.params.reference });
    if (!order) throw new ApiError(404, "Payment reference not found");
    if (String(order.customer) !== String(req.customer._id)) throw new ApiError(403, "Not your payment");

    if (order.payment.status !== "paid") {
      const result = await verifyPayment(req.params.reference);
      if (result.paid) {
        order.payment.status = "paid";
        order.payment.paidAt = new Date();
        if (order.orderStatus === "pending") order.orderStatus = "confirmed";
        order.addTimelineEvent(order.orderStatus, `Mobile money payment confirmed (${req.params.reference})`, "System");
        await order.save();
        await createCustomerNotification({
          customerId: order.customer,
          type: "payment_update",
          title: `Payment confirmed — order ${order.orderNumber}`,
          body: "Your mobile money payment was confirmed. Your order is being prepared.",
          link: `/account/orders/${order._id}`,
        });
        await createAdminNotification({
          type: "payment_update",
          area: "payments",
          title: `Mobile payment received — ${order.orderNumber}`,
          body: `${order.total.toLocaleString()} ETB via ${order.payment.gatewayProvider || "mobile"}`,
          link: `/orders/${order._id}`,
        });
      }
    }
    res.json({ success: true, status: order.payment.status, orderId: order._id });
  })
);

/**
 * POST /api/payments/webhook — gateway callback (raw-body signature verified).
 * Configure the gateway to point here: POST {API}/api/payments/webhook
 */
router.post(
  "/webhook",
  express.raw({ type: "*/*", limit: "1mb" }),
  asyncHandler(async (req, res) => {
    const signature =
      req.headers["x-signature"] || req.headers["x-chapa-signature"] || req.headers["signature"];
    if (!verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    let event;
    try {
      event = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).json({ success: false, message: "Invalid JSON" });
    }

    const reference = event?.tx_ref || event?.reference || event?.data?.tx_ref || event?.data?.reference;
    const status = String(event?.status || event?.data?.status || "").toLowerCase();
    if (!reference) return res.status(400).json({ success: false, message: "Missing reference" });

    const order = await Order.findOne({ "payment.gatewayReference": reference });
    if (!order) return res.status(404).json({ success: false, message: "Unknown reference" });

    if (order.payment.status !== "paid" && (status === "success" || status === "successful")) {
      order.payment.status = "paid";
      order.payment.paidAt = new Date();
      if (order.orderStatus === "pending") order.orderStatus = "confirmed";
      order.addTimelineEvent(order.orderStatus, `Payment confirmed via webhook (${reference})`, "System");
      await order.save();
      await createCustomerNotification({
        customerId: order.customer,
        type: "payment_update",
        title: `Payment confirmed — order ${order.orderNumber}`,
        body: "Your mobile money payment was confirmed. Your order is being prepared.",
        link: `/account/orders/${order._id}`,
      });
      await createAdminNotification({
        type: "payment_update",
        area: "payments",
        title: `Mobile payment received — ${order.orderNumber}`,
        body: `${order.total.toLocaleString()} ETB (webhook)`,
        link: `/orders/${order._id}`,
      });
    }

    res.json({ success: true });
  })
);

module.exports = router;
