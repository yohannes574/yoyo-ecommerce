/** Flat shipping fee in ETB. Replaced in Phase 5 by zone-based fees. */
const DELIVERY_FEE = 100;

const PROMO_ERRORS = {
  needsMinimum: 'Minimum order of {min} ETB required to use this promo code.',
  maxExceeded: 'Maximum discount of {max} ETB reached for this order.',
  limitReached: 'This promo code usage limit has been reached.',
  expired: 'This promo code has expired.',
  notActive: 'This promo code is not available.',
};

/** Calculate the discount a promo code would apply to a subtotal. Returns { discount } or throws. */
async function validatePromo(promo, subtotal, excludedProductIds = []) {
  const active = String(promo.active).toLowerCase() === 'true' || promo.active === true;
  if (!active) throw new Error(PROMO_ERRORS.notActive);

  if (promo.startDate && new Date(promo.startDate) > new Date()) throw new Error(PROMO_ERRORS.expired);
  if (promo.endDate && new Date(promo.endDate) < new Date()) throw new Error(PROMO_ERRORS.expired);

  if (promo.usageLimit > 0 && (promo.usedCount || 0) >= promo.usageLimit) throw new Error(PROMO_ERRORS.limitReached);
  if (subtotal < (promo.minOrder || 0)) throw new Error(PROMO_ERRORS.needsMinimum.replace('{min}', (promo.minOrder || 0)));

  let discount = promo.type === 'percent'
    ? Math.round(subtotal * ((promo.value || 0) / 100))
    : (promo.value || 0);

  if ((promo.maxDiscount || 0) > 0 && discount > promo.maxDiscount) discount = promo.maxDiscount;

  return { discount };
}

module.exports = { DELIVERY_FEE, validatePromo, PROMO_ERRORS };