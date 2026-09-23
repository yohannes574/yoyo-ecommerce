const express = require("express");
const Setting = require("../../models/Setting");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { ApiError, asyncHandler } = require("../../utils/apiError");
const { uploadProductImages } = require("../../middleware/upload");

const router = express.Router();
router.use(adminProtect);
router.use(requirePermission("content"));

const DEFAULT_HOMEPAGE = {
  banners: [], // { id, title, subtitle, image, link, cta, active, order }
  sections: {
    showCategories: true,
    showNewArrivals: true,
    showBestSellers: true,
    showFeatured: true,
    showOffers: true,
  },
};

/** GET /api/admin/content — homepage content. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const homepage = (await Setting.get("homepage", DEFAULT_HOMEPAGE)) || DEFAULT_HOMEPAGE;
    res.json({
      success: true,
      homepage: {
        banners: homepage.banners || [],
        sections: { ...DEFAULT_HOMEPAGE.sections, ...homepage.sections },
      },
    });
  })
);

/** POST /api/admin/content/banners — create banner (image via multipart `image` or URL). */
router.post(
  "/banners",
  uploadProductImages.single("image"),
  asyncHandler(async (req, res) => {
    const homepage = (await Setting.get("homepage", DEFAULT_HOMEPAGE)) || DEFAULT_HOMEPAGE;
    const { title, subtitle, link, cta, active } = req.body;
    const image = req.file ? `/uploads/products/${req.file.filename}` : req.body.image || "";
    if (!title?.trim()) throw new ApiError(400, "Banner title is required");

    const banner = {
      id: `b${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle?.trim() || "",
      image,
      link: link?.trim() || "/shop",
      cta: cta?.trim() || "Shop now",
      active: active !== false,
      order: (homepage.banners || []).length,
    };
    homepage.banners = [...(homepage.banners || []), banner];
    await Setting.set("homepage", homepage);
    res.status(201).json({ success: true, message: "Banner added", banner, banners: homepage.banners });
  })
);

/** PUT /api/admin/content/banners/:id */
router.put(
  "/banners/:id",
  uploadProductImages.single("image"),
  asyncHandler(async (req, res) => {
    const homepage = (await Setting.get("homepage", DEFAULT_HOMEPAGE)) || DEFAULT_HOMEPAGE;
    const banner = (homepage.banners || []).find((b) => b.id === req.params.id);
    if (!banner) throw new ApiError(404, "Banner not found");
    const { title, subtitle, link, cta, active, order } = req.body;
    if (title !== undefined) banner.title = String(title).trim();
    if (subtitle !== undefined) banner.subtitle = String(subtitle).trim();
    if (link !== undefined) banner.link = String(link).trim();
    if (cta !== undefined) banner.cta = String(cta).trim();
    if (active !== undefined) banner.active = !!active;
    if (order !== undefined) banner.order = Number(order) || 0;
    if (req.file) banner.image = `/uploads/products/${req.file.filename}`;
    else if (req.body.image !== undefined) banner.image = String(req.body.image);
    await Setting.set("homepage", homepage);
    res.json({ success: true, message: "Banner updated", banners: homepage.banners });
  })
);

/** DELETE /api/admin/content/banners/:id */
router.delete(
  "/banners/:id",
  asyncHandler(async (req, res) => {
    const homepage = (await Setting.get("homepage", DEFAULT_HOMEPAGE)) || DEFAULT_HOMEPAGE;
    homepage.banners = (homepage.banners || []).filter((b) => b.id !== req.params.id);
    await Setting.set("homepage", homepage);
    res.json({ success: true, message: "Banner deleted", banners: homepage.banners });
  })
);

/** PUT /api/admin/content/sections — toggle homepage sections. */
router.put(
  "/sections",
  asyncHandler(async (req, res) => {
    const homepage = (await Setting.get("homepage", DEFAULT_HOMEPAGE)) || DEFAULT_HOMEPAGE;
    homepage.sections = { ...DEFAULT_HOMEPAGE.sections, ...homepage.sections, ...req.body };
    await Setting.set("homepage", homepage);
    res.json({ success: true, message: "Homepage sections updated", sections: homepage.sections });
  })
);

module.exports = router;
