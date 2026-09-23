const express = require("express");
const Setting = require("../../models/Setting");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission, permissionsFor } = require("../../utils/permissions");
const { ApiError, asyncHandler } = require("../../utils/apiError");

const router = express.Router();
router.use(adminProtect);

const DEFAULT_COMPANY = {
  name: "Yoyo E-Commerce PLC",
  logo: "",
  phone: "+251911000000",
  email: "support@yoyo.com",
  address: "Bole Road, Addis Ababa, Ethiopia",
  social: { facebook: "", instagram: "", telegram: "", whatsapp: "" },
};

const DEFAULT_PAYMENT = {
  methods: {
    cash_on_delivery: true,
    bank_transfer: true,
    mobile: false, // enabled once the gateway is configured (Phase 7)
  },
  banks: [
    { id: "cbe", name: "Commercial Bank of Ethiopia (CBE)", account: "", holder: "", branch: "", instructions: "", active: true },
    { id: "abyssinia", name: "Bank of Abyssinia", account: "", holder: "", branch: "", instructions: "", active: false },
    { id: "awash", name: "Awash Bank", account: "", holder: "", branch: "", instructions: "", active: false },
    { id: "dashen", name: "Dashen Bank", account: "", holder: "", branch: "", instructions: "", active: false },
  ],
};

/** GET /api/admin/settings — all settings (requires settings permission OR any staff for read-only parts). */
router.get(
  "/",
  requirePermission("settings"),
  asyncHandler(async (req, res) => {
    const [company, payment, delivery] = await Promise.all([
      Setting.get("company", DEFAULT_COMPANY),
      Setting.get("payment", DEFAULT_PAYMENT),
      Setting.get("delivery", { defaultFee: 100, defaultExpressFee: 250, freeDeliveryThreshold: 0 }),
    ]);
    res.json({
      success: true,
      company: { ...DEFAULT_COMPANY, ...company },
      payment: {
        methods: { ...DEFAULT_PAYMENT.methods, ...payment?.methods },
        banks: payment?.banks || DEFAULT_PAYMENT.banks,
      },
      delivery,
      permissions: permissionsFor(req.admin.role),
    });
  })
);

/** PUT /api/admin/settings/company */
router.put(
  "/company",
  requirePermission("settings"),
  asyncHandler(async (req, res) => {
    const current = (await Setting.get("company", DEFAULT_COMPANY)) || DEFAULT_COMPANY;
    const next = { ...DEFAULT_COMPANY, ...current };
    for (const k of ["name", "logo", "phone", "email", "address"]) {
      if (req.body[k] !== undefined) next[k] = String(req.body[k]);
    }
    if (req.body.social) next.social = { ...next.social, ...req.body.social };
    await Setting.set("company", next);
    res.json({ success: true, message: "Company settings saved", company: next });
  })
);

/** PUT /api/admin/settings/payment — method toggles + bank accounts. */
router.put(
  "/payment",
  requirePermission("settings"),
  asyncHandler(async (req, res) => {
    const current = (await Setting.get("payment", DEFAULT_PAYMENT)) || DEFAULT_PAYMENT;
    const next = {
      methods: { ...DEFAULT_PAYMENT.methods, ...current?.methods },
      banks: current?.banks || DEFAULT_PAYMENT.banks,
    };
    if (req.body.methods) {
      for (const k of ["cash_on_delivery", "bank_transfer", "mobile"]) {
        if (req.body.methods[k] !== undefined) next.methods[k] = !!req.body.methods[k];
      }
    }
    if (Array.isArray(req.body.banks)) next.banks = req.body.banks.slice(0, 10);
    if (req.body.mobileProvider) next.mobileProvider = String(req.body.mobileProvider);
    await Setting.set("payment", next);
    res.json({ success: true, message: "Payment settings saved", payment: next });
  })
);

module.exports = router;
