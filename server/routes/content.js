const express = require("express");
const Setting = require("../models/Setting");
const { asyncHandler } = require("../utils/apiError");

const router = express.Router();

/**
 * GET /api/content — public homepage content + storefront config.
 * Exposes: active hero banners, section visibility, company info,
 * enabled payment methods and active bank accounts (for checkout).
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const [homepage, company, payment] = await Promise.all([
      Setting.get("homepage", { banners: [], sections: {} }),
      Setting.get("company", {}),
      Setting.get("payment", {}),
    ]);

    const banners = (homepage?.banners || [])
      .filter((b) => b.active)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const methods = payment?.methods || {};
    const banks = (payment?.banks || []).filter((b) => b.active && b.account);

    res.json({
      success: true,
      banners,
      sections: homepage?.sections || {},
      company: {
        name: company?.name || "Yoyo",
        phone: company?.phone || "",
        email: company?.email || "",
        address: company?.address || "",
        social: company?.social || {},
      },
      payment: {
        methods: {
          cash_on_delivery: methods.cash_on_delivery !== false,
          bank_transfer: methods.bank_transfer !== false,
          mobile: !!methods.mobile,
        },
        banks: banks.map((b) => ({
          id: b.id,
          name: b.name,
          account: b.account,
          holder: b.holder,
          branch: b.branch || "",
          instructions: b.instructions || "",
        })),
      },
    });
  })
);

module.exports = router;
