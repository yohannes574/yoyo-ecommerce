const DeliveryZone = require("../models/DeliveryZone");
const Setting = require("../models/Setting");

const DEFAULT_DELIVERY = {
  defaultFee: 100,
  defaultExpressFee: 250,
  freeDeliveryThreshold: 0, // 0 = disabled
};

const escapeRx = (s) => String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Find an active delivery zone for a flat address (case-insensitive). */
const findZone = async (address) => {
  if (!address || !address.city) return null;
  const q = { city: new RegExp(`^${escapeRx(address.city)}$`, "i"), active: true };
  if (address.subCity) q.subCity = new RegExp(`^${escapeRx(address.subCity)}$`, "i");
  return DeliveryZone.findOne(q);
};

/**
 * Delivery fee in ETB for the given flat address.
 * Looks up an active zone by city + subCity, falls back to the
 * admin-configured default fee. Express costs more when the zone defines it.
 */
const deliveryFeeFor = async (address, method = "standard", subtotal = 0) => {
  const settings = (await Setting.get("delivery", DEFAULT_DELIVERY)) || DEFAULT_DELIVERY;

  // Free delivery threshold (0 = disabled, standard only)
  const threshold = Number(settings.freeDeliveryThreshold) || 0;
  if (threshold > 0 && subtotal >= threshold && method !== "express") return 0;

  let fee = Number(settings.defaultFee) || 0;
  if (method === "express") fee = Number(settings.defaultExpressFee) || fee;

  const zone = await findZone(address);
  if (zone) {
    fee = method === "express" ? (zone.expressFee ?? zone.standardFee) : zone.standardFee;
  }

  return fee;
};

/**
 * Full quote for the checkout UI: both method fees for one address.
 * - `express: null` means the zone has no express service (admin left it empty).
 * - Free-delivery threshold applies to standard only (express stays paid).
 */
const quoteDelivery = async (address, subtotal = 0) => {
  const settings = (await Setting.get("delivery", DEFAULT_DELIVERY)) || DEFAULT_DELIVERY;
  const zone = await findZone(address);

  const threshold = Number(settings.freeDeliveryThreshold) || 0;
  const freeStandard = threshold > 0 && subtotal >= threshold;

  const standard = freeStandard ? 0 : zone ? zone.standardFee : Number(settings.defaultFee) || 0;

  const expressAvailable = zone ? zone.expressFee != null : true;
  const express = expressAvailable
    ? zone
      ? zone.expressFee ?? zone.standardFee
      : Number(settings.defaultExpressFee) || 0
    : null;

  return {
    standard,
    express,
    expressAvailable,
    standardEta: (zone && zone.etaDays) || "2–3",
    expressEta: "1", // same-day / next-morning dispatch
  };
};

module.exports = { deliveryFeeFor, quoteDelivery, DEFAULT_DELIVERY };
