const express = require("express");
const DeliveryZone = require("../../models/DeliveryZone");
const DeliveryStaff = require("../../models/DeliveryStaff");
const Setting = require("../../models/Setting");
const Order = require("../../models/Order");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { ApiError, asyncHandler } = require("../../utils/apiError");
const { DEFAULT_DELIVERY } = require("../../utils/delivery");
const { createCustomerNotification } = require("../../utils/notifications");

const router = express.Router();
router.use(adminProtect);

router.use("/", requirePermission("delivery"));

/* ---------- Zones ---------- */

/** GET /api/admin/delivery/zones */
router.get(
  "/zones",
  asyncHandler(async (req, res) => {
    const zones = await DeliveryZone.find().sort({ city: 1, subCity: 1 });
    res.json({
      success: true,
      zones: zones.map((z) => ({
        id: z._id,
        city: z.city,
        subCity: z.subCity,
        zone: z.zone,
        standardFee: z.standardFee,
        expressFee: z.expressFee,
        etaDays: z.etaDays,
        active: z.active,
      })),
    });
  })
);

/** POST /api/admin/delivery/zones */
router.post(
  "/zones",
  asyncHandler(async (req, res) => {
    const { city, subCity, zone, standardFee, expressFee, etaDays, active } = req.body;
    if (!city?.trim() || !subCity?.trim()) throw new ApiError(400, "City and sub-city are required");
    const exists = await DeliveryZone.findOne({ city: city.trim(), subCity: subCity.trim() });
    if (exists) throw new ApiError(400, `Zone for ${city}/${subCity} already exists`);
    const z = await DeliveryZone.create({
      city: city.trim(),
      subCity: subCity.trim(),
      zone: zone?.trim() || "",
      standardFee: Math.max(0, Number(standardFee) || 0),
      expressFee: expressFee === undefined || expressFee === null || expressFee === "" ? undefined : Math.max(0, Number(expressFee)),
      etaDays: etaDays?.trim() || "2–3",
      active: active !== false,
    });
    res.status(201).json({ success: true, message: "Zone created", id: z._id });
  })
);

/** PUT /api/admin/delivery/zones/:id */
router.put(
  "/zones/:id",
  asyncHandler(async (req, res) => {
    const z = await DeliveryZone.findById(req.params.id);
    if (!z) throw new ApiError(404, "Zone not found");
    const { city, subCity, zone, standardFee, expressFee, etaDays, active } = req.body;
    if (city?.trim()) z.city = city.trim();
    if (subCity?.trim()) z.subCity = subCity.trim();
    if (zone !== undefined) z.zone = zone.trim();
    if (standardFee !== undefined) z.standardFee = Math.max(0, Number(standardFee) || 0);
    if (expressFee !== undefined) z.expressFee = expressFee === null || expressFee === "" ? undefined : Math.max(0, Number(expressFee));
    if (etaDays !== undefined) z.etaDays = etaDays.trim();
    if (active !== undefined) z.active = !!active;
    await z.save();
    res.json({ success: true, message: "Zone updated" });
  })
);

/** DELETE /api/admin/delivery/zones/:id */
router.delete(
  "/zones/:id",
  asyncHandler(async (req, res) => {
    const z = await DeliveryZone.findByIdAndDelete(req.params.id);
    if (!z) throw new ApiError(404, "Zone not found");
    res.json({ success: true, message: "Zone deleted" });
  })
);

/* ---------- Delivery settings ---------- */

/** GET /api/admin/delivery/settings */
router.get(
  "/settings",
  asyncHandler(async (req, res) => {
    const value = (await Setting.get("delivery", DEFAULT_DELIVERY)) || DEFAULT_DELIVERY;
    res.json({ success: true, settings: { ...DEFAULT_DELIVERY, ...value } });
  })
);

/** PUT /api/admin/delivery/settings */
router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const current = (await Setting.get("delivery", DEFAULT_DELIVERY)) || DEFAULT_DELIVERY;
    const next = { ...DEFAULT_DELIVERY, ...current };
    for (const k of ["defaultFee", "defaultExpressFee", "freeDeliveryThreshold"]) {
      if (req.body[k] !== undefined) next[k] = Math.max(0, Number(req.body[k]) || 0);
    }
    await Setting.set("delivery", next);
    res.json({ success: true, message: "Delivery settings saved", settings: next });
  })
);

/* ---------- Staff ---------- */

/** GET /api/admin/delivery/staff */
router.get(
  "/staff",
  asyncHandler(async (req, res) => {
    const staff = await DeliveryStaff.find().sort({ name: 1 });
    // count active (not delivered/cancelled) assigned orders per staff
    const counts = await Order.aggregate([
      { $match: { deliveryStaff: { $ne: null }, orderStatus: { $nin: ["delivered", "cancelled"] } } },
      { $group: { _id: "$deliveryStaff", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json({
      success: true,
      staff: staff.map((s) => ({
        id: s._id,
        name: s.name,
        phone: s.phone,
        zone: s.zone,
        active: s.active,
        currentOrders: countMap.get(String(s._id)) || 0,
      })),
    });
  })
);

/** POST /api/admin/delivery/staff */
router.post(
  "/staff",
  asyncHandler(async (req, res) => {
    const { name, phone, zone } = req.body;
    if (!name?.trim() || !phone?.trim()) throw new ApiError(400, "Name and phone are required");
    const s = await DeliveryStaff.create({ name: name.trim(), phone: phone.trim(), zone: zone?.trim() || "" });
    res.status(201).json({ success: true, message: "Staff added", id: s._id });
  })
);

/** PUT /api/admin/delivery/staff/:id */
router.put(
  "/staff/:id",
  asyncHandler(async (req, res) => {
    const s = await DeliveryStaff.findById(req.params.id);
    if (!s) throw new ApiError(404, "Staff member not found");
    const { name, phone, zone, active } = req.body;
    if (name?.trim()) s.name = name.trim();
    if (phone?.trim()) s.phone = phone.trim();
    if (zone !== undefined) s.zone = zone.trim();
    if (active !== undefined) s.active = !!active;
    await s.save();
    res.json({ success: true, message: "Staff updated" });
  })
);

/** DELETE /api/admin/delivery/staff/:id */
router.delete(
  "/staff/:id",
  asyncHandler(async (req, res) => {
    const s = await DeliveryStaff.findByIdAndDelete(req.params.id);
    if (!s) throw new ApiError(404, "Staff member not found");
    res.json({ success: true, message: "Staff removed" });
  })
);

/* ---------- Assignment ---------- */

/** GET /api/admin/delivery/assignments — orders ready for / out for delivery with staff info. */
router.get(
  "/assignments",
  asyncHandler(async (req, res) => {
    const orders = await Order.find({
      orderStatus: { $in: ["ready_for_delivery", "out_for_delivery"] },
    })
      .populate("deliveryStaff", "name phone")
      .sort({ updatedAt: -1 })
      .limit(100);
    res.json({
      success: true,
      orders: orders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        customerName: o.address?.fullName,
        phone: o.address?.phone,
        city: o.address?.city,
        subCity: o.address?.subCity,
        address: o.address?.address,
        status: o.orderStatus,
        staff: o.deliveryStaff ? { id: o.deliveryStaff._id, name: o.deliveryStaff.name, phone: o.deliveryStaff.phone } : null,
        updatedAt: o.updatedAt,
      })),
    });
  })
);

/** POST /api/admin/delivery/assign — assign a staff member to an order. */
router.post(
  "/assign",
  asyncHandler(async (req, res) => {
    const { orderId, staffId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, "Order not found");
    const staff = await DeliveryStaff.findById(staffId);
    if (!staff) throw new ApiError(404, "Staff member not found");
    if (!staff.active) throw new ApiError(400, "This staff member is deactivated");

    order.deliveryStaff = staff._id;
    if (order.orderStatus === "ready_for_delivery") {
      order.orderStatus = "out_for_delivery";
      order.addTimelineEvent("out_for_delivery", `Assigned to ${staff.name} (${staff.phone}) — out for delivery`, req.admin.name || "Admin");
    } else {
      order.addTimelineEvent(order.orderStatus, `Delivery assigned to ${staff.name} (${staff.phone})`, req.admin.name || "Admin");
    }
    await order.save();

    await createCustomerNotification({
      customerId: order.customer,
      type: "order_update",
      title: `Order ${order.orderNumber} is on the way`,
      body: `${staff.name} will deliver your order. Phone: ${staff.phone}`,
      link: `/account/orders/${order._id}`,
    });

    res.json({ success: true, message: `${staff.name} assigned to ${order.orderNumber}` });
  })
);

module.exports = router;
