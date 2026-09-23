const express = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");
const { ApiError, asyncHandler } = require("../utils/apiError");
const { serializeProduct, availableFor, unitPrice, salePrice } = require("../utils/serialize");

const router = express.Router();
router.use(protect);

const getCart = async (customerId) => {
  let cart = await Cart.findOne({ customer: customerId });
  if (!cart) {
    cart = await Cart.create({ customer: customerId, items: [] });
  }
  return cart;
};

const serializeCart = async (customerId) => {
  const cart = await getCart(customerId);
  const populated = await Cart.findById(cart._id).populate({
    path: "items.product",
    populate: { path: "category", select: "name slug" },
  });

  const items = [];
  let subtotal = 0;
  for (const item of populated.items) {
    const product = item.product;
    if (!product) continue;
    const variant = (product.variants || []).find((v) => v.name === item.variantName);
    const price = salePrice(product, variant);
    const available = availableFor(product, variant);
    // Clamp stale quantities to what is actually available
    const qty = Math.min(item.qty, Math.max(available, 0) || item.qty, 99);
    const lineTotal = qty * price;
    subtotal += lineTotal;
    items.push({
      product: serializeProduct(product),
      variantName: item.variantName || "",
      qty,
      price,
      lineTotal,
      available,
    });
  }
  return { items, count: items.reduce((n, i) => n + i.qty, 0), subtotal };
};

const findVariant = (product, variantName) =>
  variantName ? (product.variants || []).find((v) => v.name === variantName) : null;

/** GET /api/cart */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ success: true, cart: await serializeCart(req.customer._id) });
  })
);

/** POST /api/cart/items  { productId, variantName?, qty? } */
router.post(
  "/items",
  asyncHandler(async (req, res) => {
    const { productId, variantName, qty = 1 } = req.body;
    if (!productId) throw new ApiError(400, "productId is required");

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");
    if (product.status !== "active") throw new ApiError(400, "Product is not available");

    const variant = findVariant(product, variantName);
    if (variantName && !variant) throw new ApiError(400, "Selected variant not found");

    const available = availableFor(product, variant);
    const requested = Number(qty) || 1;
    if (available <= 0) throw new ApiError(400, "This product is out of stock");
    if (requested > available) {
      throw new ApiError(400, `Only ${available} unit(s) available in stock`);
    }

    const cart = await getCart(req.customer._id);
    const key = (i) => `${i.product}|${i.variantName || ""}`;
    const existing = cart.items.find((i) => key(i) === `${productId}|${variantName || ""}`);

    if (existing) {
      const newQty = Math.min(existing.qty + requested, available, 99);
      existing.qty = newQty;
    } else {
      cart.items.push({ product: productId, variantName: variantName || "", qty: Math.min(requested, 99) });
    }
    await cart.save();

    res.json({ success: true, cart: await serializeCart(req.customer._id) });
  })
);

/** PATCH /api/cart/items  { productId, variantName?, qty } — set quantity (0 removes) */
router.patch(
  "/items",
  asyncHandler(async (req, res) => {
    const { productId, variantName, qty } = req.body;
    if (!productId || qty === undefined) {
      throw new ApiError(400, "productId and qty are required");
    }

    const cart = await getCart(req.customer._id);
    const key = (i) => `${i.product}|${i.variantName || ""}`;
    const item = cart.items.find((i) => key(i) === `${productId}|${variantName || ""}`);
    if (!item) throw new ApiError(404, "Item not in cart");

    const requested = Number(qty) || 0;
    if (requested <= 0) {
      cart.items = cart.items.filter((i) => key(i) !== `${productId}|${variantName || ""}`);
    } else {
      const product = await Product.findById(productId);
      if (product) {
        const variant = findVariant(product, variantName);
        const available = availableFor(product, variant);
        if (available <= 0) throw new ApiError(400, "This product is out of stock");
        item.qty = Math.min(requested, available, 99);
      } else {
        item.qty = Math.min(requested, 99);
      }
    }
    await cart.save();
    res.json({ success: true, cart: await serializeCart(req.customer._id) });
  })
);

/** DELETE /api/cart/items  { productId, variantName? } */
router.delete(
  "/items",
  asyncHandler(async (req, res) => {
    const { productId, variantName } = req.body;
    if (!productId) throw new ApiError(400, "productId is required");
    const cart = await getCart(req.customer._id);
    const key = (i) => `${i.product}|${i.variantName || ""}`;
    cart.items = cart.items.filter((i) => key(i) !== `${productId}|${variantName || ""}`);
    await cart.save();
    res.json({ success: true, cart: await serializeCart(req.customer._id) });
  })
);

/** DELETE /api/cart */
router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const cart = await getCart(req.customer._id);
    cart.items = [];
    await cart.save();
    res.json({ success: true, cart: await serializeCart(req.customer._id) });
  })
);

module.exports = router;