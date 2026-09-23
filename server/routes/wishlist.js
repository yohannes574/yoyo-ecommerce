const express = require("express");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");
const { ApiError, asyncHandler } = require("../utils/apiError");
const { serializeProduct } = require("../utils/serialize");

const router = express.Router();
router.use(protect);

const getWishlist = async (customerId) => {
  let wl = await Wishlist.findOne({ customer: customerId });
  if (!wl) wl = await Wishlist.create({ customer: customerId, products: [] });
  return wl;
};

const serializeWishlist = async (customerId) => {
  const wl = await getWishlist(customerId);
  await wl.populate({
    path: "products",
    populate: { path: "category", select: "name slug" },
  });
  return {
    products: wl.products
      .filter((p) => p && p.status === "active")
      .map((p) => serializeProduct(p)),
  };
};

/** GET /api/wishlist */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ success: true, wishlist: await serializeWishlist(req.customer._id) });
  })
);

/** POST /api/wishlist { productId } */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { productId } = req.body;
    if (!productId) throw new ApiError(400, "productId is required");
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    const wl = await getWishlist(req.customer._id);
    if (!wl.products.some((id) => String(id) === String(productId))) {
      wl.products.push(productId);
      await wl.save();
    }
    res.json({ success: true, wishlist: await serializeWishlist(req.customer._id) });
  })
);

/** DELETE /api/wishlist/:productId */
router.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    const wl = await getWishlist(req.customer._id);
    wl.products = wl.products.filter((id) => String(id) !== String(req.params.productId));
    await wl.save();
    res.json({ success: true, wishlist: await serializeWishlist(req.customer._id) });
  })
);

module.exports = router;