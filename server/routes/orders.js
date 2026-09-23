const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const { asyncHandler } = require("../utils/apiError");
const Address = require("../models/Address");

// All address routes require a logged-in customer
router.use(protect);

/** GET /api/addresses — customer's saved addresses */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const addresses = await Address.find({ customer: req.customer._id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({
      success: true,
      addresses: addresses.map((a) => ({
        id: a._id,
        label: a.label,
        fullName: a.fullName,
        phone: a.phone,
        region: a.region,
        city: a.city,
        subCity: a.subCity,
        woreda: a.woreda,
        address: a.address,
        deliveryInstructions: a.deliveryInstructions,
        isDefault: !!a.isDefault,
        createdAt: a.createdAt,
      })),
    });
  })
);

/** POST /api/addresses — save a new address */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { label = "Home", fullName, phone, region, city, subCity, woreda, address, deliveryInstructions, isDefault = false } = req.body;

    // Resolve default flag: if this one is set as default, clear others
    if (isDefault) {
      await Address.updateMany({ customer: req.customer._id }, { isDefault: false });
    }
    const a = await Address.create({
      customer: req.customer._id,
      label: label || "Home",
      fullName: fullName?.trim() || "",
      phone: phone?.trim() || "",
      region: region?.trim() || "",
      city: city?.trim() || "",
      subCity: subCity?.trim() || "",
      woreda: woreda?.trim() || "",
      address: address?.trim() || "",
      deliveryInstructions: deliveryInstructions?.trim() || "",
      isDefault: isDefault === true,
    });
    const doc = await Address.findById(a._id);
    res.status(201).json({
      success: true,
      address: {
        id: doc._id,
        label: doc.label,
        fullName: doc.fullName,
        phone: doc.phone,
        region: doc.region,
        city: doc.city,
        subCity: doc.subCity,
        woreda: doc.woreda,
        address: doc.address,
        deliveryInstructions: doc.deliveryInstructions,
        isDefault: !!doc.isDefault,
        createdAt: doc.createdAt,
      },
    });
  })
);

/** PATCH /api/addresses/:id — edit an address */
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { label, fullName, phone, region, city, subCity, woreda, address, deliveryInstructions, isDefault = false } = req.body;
    const a = await Address.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!a) throw new ApiError(404, "Address not found");

    if (isDefault) await Address.updateMany({ customer: req.customer._id, _id: { $ne: req.params.id } }, { isDefault: false });

    await Address.findByIdAndUpdate(req.params.id, {
      label: label !== undefined ? label.trim() : undefined,
      fullName: fullName !== undefined ? fullName.trim() : undefined,
      phone: phone !== undefined ? phone.trim() : undefined,
      region: region !== undefined ? region.trim() : undefined,
      city: city !== undefined ? city.trim() : undefined,
      subCity: subCity !== undefined ? subCity.trim() : undefined,
      woreda: woreda !== undefined ? woreda.trim() : undefined,
      address: address !== undefined ? address.trim() : undefined,
      deliveryInstructions: deliveryInstructions !== undefined ? deliveryInstructions.trim() : undefined,
      isDefault: !!isDefault,
    });
    const updated = await Address.findById(req.params.id);
    res.json({
      success: true,
      address: {
        id: updated._id,
        label: updated.label,
        fullName: updated.fullName,
        phone: updated.phone,
        region: updated.region,
        city: updated.city,
        subCity: updated.subCity,
        woreda: updated.woreda,
        address: updated.address,
        deliveryInstructions: updated.deliveryInstructions,
        isDefault: !!updated.isDefault,
        createdAt: updated.createdAt,
      },
    });
  })
);

/** DELETE /api/addresses/:id — remove an address */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await Address.deleteOne({ _id: req.params.id, customer: req.customer._id });
    if (result.deletedCount === 0) throw new ApiError(404, "Address not found");
    await Address.findByIdAndUpdate(req.params.id, { isDefault: false }).catch(() => {});
    res.json({ success: true });
  })
);

/** PUT /api/addresses/:id/default — toggle default on a specific address */
router.put(
  "/:id/default",
  asyncHandler(async (req, res) => {
    const a = await Address.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!a) throw new ApiError(404, "Address not found");
    const makeDefault = !a.isDefault;
    await Address.updateMany({ customer: req.customer._id }, { isDefault: false });
    await Address.findByIdAndUpdate(req.params.id, { isDefault: makeDefault });
    const updated = await Address.findById(req.params.id);
    res.json({
      success: true,
      address: {
        id: updated._id,
        label: updated.label,
        fullName: updated.fullName,
        phone: updated.phone,
        region: updated.region,
        city: updated.city,
        subCity: updated.subCity,
        woreda: updated.woreda,
        address: updated.address,
        deliveryInstructions: updated.deliveryInstructions,
        isDefault: !!updated.isDefault,
        createdAt: updated.createdAt,
      },
    });
  })
);

module.exports = router;