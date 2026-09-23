/**
 * Gateway-agnostic mobile money payment service.
 *
 * Supports any aggregator with a "Chapa-style" API shape:
 *   POST  {GATEWAY_BASE_URL}/transaction/initialize   → { checkout_url | data.checkout_url }
 *   GET   {GATEWAY_BASE_URL}/transaction/verify/:ref  → { status: "success", data: { status, amount, currency } }
 *   POST  webhook → body + `GATEWAY_WEBHOOK_SECRET` HMAC (x-signature header, hex sha256)
 *
 * Providers (Telebirr / CBE Birr / M-Pesa) are reached through the aggregator,
 * so the platform only needs ONE integration. Configure in server/.env:
 *   GATEWAY_BASE_URL=https://api.chapa.co/v1
 *   GATEWAY_SECRET_KEY=CHASECK-...
 *   GATEWAY_WEBHOOK_SECRET=...
 *   GATEWAY_PUBLIC_KEY=...            (optional, for widget checkout)
 *   GATEWAY_PROVIDER_NAMES=telebirr,cbebirr,mpesa   (labels shown at checkout)
 *
 * Without credentials the module works in MOCK mode: init returns an internal
 * mock checkout URL and verify succeeds for refs starting with MOCK-.
 */
const crypto = require("crypto");
const Setting = require("../models/Setting");

const isConfigured = () =>
  !!(process.env.GATEWAY_BASE_URL && process.env.GATEWAY_SECRET_KEY);

const providerLabels = () =>
  (process.env.GATEWAY_PROVIDER_NAMES || "telebirr,cbebirr,mpesa")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Create a payment at the gateway. Returns { reference, checkoutUrl, mock } */
const initializePayment = async ({ orderId, orderNumber, amount, email, firstName, lastName, phone, callbackUrl }) => {
  const reference = `YOYO-${orderNumber}-${Date.now().toString(36).toUpperCase()}`;

  if (!isConfigured()) {
    // MOCK mode
    const base = process.env.PUBLIC_BASE_URL || "http://localhost:5173";
    return {
      reference,
      mock: true,
      checkoutUrl: `${base}/payment/mock-pay?reference=${encodeURIComponent(reference)}&amount=${amount}&order=${orderNumber}`,
    };
  }

  const res = await fetch(`${process.env.GATEWAY_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GATEWAY_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: "ETB",
      email: email || "customer@yoyo.com",
      first_name: firstName || "Yoyo",
      last_name: lastName || "Customer",
      phone: phone || "",
      tx_ref: reference,
      callback_url: callbackUrl,
      customization: { title: "Yoyo E-Commerce", description: `Order ${orderNumber}` },
      meta: { orderId: String(orderId), orderNumber },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Payment gateway error (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json().catch(() => ({}));
  const checkoutUrl =
    data?.data?.checkout_url || data?.data?.url || data?.checkout_url || data?.url;
  if (!checkoutUrl) throw new Error("Payment gateway did not return a checkout URL");
  return { reference, checkoutUrl, mock: false };
};

/** Verify a payment reference with the gateway. Returns { paid, amount, raw } */
const verifyPayment = async (reference) => {
  if (!isConfigured()) {
    // MOCK mode: any reference beginning with MOCK- is instantly "paid"
    if (reference.startsWith("MOCK-")) return { paid: true, amount: null, mock: true };
    return { paid: false, amount: null, mock: true };
  }
  const res = await fetch(
    `${process.env.GATEWAY_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${process.env.GATEWAY_SECRET_KEY}` } }
  );
  if (!res.ok) return { paid: false, amount: null };
  const data = await res.json().catch(() => ({}));
  const status = String(data?.data?.status || data?.status || "").toLowerCase();
  return { paid: status === "success" || status === "successful", amount: data?.data?.amount, raw: data };
};

/** Verify an HMAC-SHA256 webhook signature (hex). Constant-time compare. */
const verifyWebhookSignature = (rawBody, signatureHeader) => {
  const secret = process.env.GATEWAY_WEBHOOK_SECRET;
  if (!secret) return false; // refuse unsigned webhooks when secret is expected
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureHeader).replace(/^sha256=/i, ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/** Public info the storefront needs to render the mobile money option. */
const publicConfig = async () => {
  const payment = await Setting.get("payment", {});
  return {
    enabled: !!(payment?.methods?.mobile && isConfigured()) || !!(payment?.methods?.mobile && true),
    mode: isConfigured() ? "live" : "mock",
    providers: providerLabels(),
  };
};

module.exports = {
  isConfigured,
  initializePayment,
  verifyPayment,
  verifyWebhookSignature,
  providerLabels,
  publicConfig,
};
