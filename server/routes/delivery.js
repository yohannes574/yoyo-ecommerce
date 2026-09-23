const express = require("express");
const DeliveryZone = require("../models/DeliveryZone");
const Setting = require("../models/Setting");
const { asyncHandler } = require("../utils/apiError");
const { deliveryFeeFor, quoteDelivery } = require("../utils/delivery");

const router = express.Router();

/**
 * GET /api/delivery/quote?city=&subCity=&subtotal=&method=
 * Public quote used by the checkout delivery step.
 * Returns BOTH methods at once for the given address:
 *   { standard, express, expressAvailable, standardEta, expressEta, fee, method }
 * `express: null` means the zone has no express service.
 * `fee`/`method` echo the selected method for backward compatibility.
 */
router.get(
  "/quote",
  asyncHandler(async (req, res) => {
    const { city, subCity, method = "standard", subtotal = 0 } = req.query;
    const address = { city: city || "", subCity: subCity || "" };

    const quote = await quoteDelivery(address, Number(subtotal) || 0);
    const selected = method === "express" ? "express" : "standard";
    const fee = selected === "express" ? quote.express : quote.standard;

    res.json({ success: true, ...quote, fee, method: selected });
  })
);

/** GET /api/delivery/zones — active zones (public, for checkout hints). */
router.get(
  "/zones",
  asyncHandler(async (req, res) => {
    const zones = await DeliveryZone.find({ active: true }).sort({ city: 1, subCity: 1 });
    res.json({
      success: true,
      zones: zones.map((z) => ({
        id: z._id,
        city: z.city,
        subCity: z.subCity,
        standardFee: z.standardFee,
        expressFee: z.expressFee,
        etaDays: z.etaDays,
      })),
    });
  })
);

module.exports = router;
