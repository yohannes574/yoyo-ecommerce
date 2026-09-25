const express = require("express");
const Customer = require("../../models/Customer");
const Order = require("../../models/Order");
const Address = require("../../models/Address");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { ApiError, asyncHandler } = require("../../utils/apiError");

const router = express.Router();
router.use(adminProtect);

router.use("/", requirePermission("customers"));

/**
 * GET /api/admin/customers
 * List customers with search, order stats, spend aggregation, and pagination
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, status, page = 1, limit = 20 } = req.query;

    const query = {};

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
        { phone: { $regex: term, $options: "i" } },
      ];
    }

    if (status && ["active", "disabled"].includes(status)) {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, customers] = await Promise.all([
      Customer.countDocuments(query),
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    ]);

    // Aggregate orders and total spent for these customers
    const customerIds = customers.map((c) => c._id);
    const orderStats = await Order.aggregate([
      { $match: { customer: { $in: customerIds }, orderStatus: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$customer",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$total" },
        },
      },
    ]);

    const statsMap = {};
    orderStats.forEach((s) => {
      statsMap[s._id.toString()] = {
        orderCount: s.orderCount,
        totalSpent: s.totalSpent,
      };
    });

    const result = customers.map((c) => ({
      id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone || "",
      status: c.status || "active",
      orderCount: statsMap[c._id.toString()]?.orderCount || 0,
      totalSpent: statsMap[c._id.toString()]?.totalSpent || 0,
      createdAt: c.createdAt,
    }));

    res.json({
      success: true,
      customers: result,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  })
);

/**
 * GET /api/admin/customers/:id
 * Single customer detail with order history and saved addresses
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) throw new ApiError(404, "Customer not found");

    const [orders, addresses] = await Promise.all([
      Order.find({ customer: customer._id }).sort({ createdAt: -1 }),
      Address.find({ customer: customer._id }).sort({ isDefault: -1, createdAt: -1 }),
    ]);

    const totalSpent = orders
      .filter((o) => o.orderStatus !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0);

    res.json({
      success: true,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        status: customer.status || "active",
        createdAt: customer.createdAt,
        totalOrders: orders.length,
        totalSpent,
      },
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
        isDefault: a.isDefault,
      })),
      orders: orders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        itemsCount: o.items.length,
        total: o.total,
        orderStatus: o.orderStatus,
        paymentStatus: o.payment.status,
        paymentMethod: o.payment.method,
        createdAt: o.createdAt,
      })),
    });
  })
);

/**
 * PATCH /api/admin/customers/:id/status
 * Toggle customer account active or disabled
 */
router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status || !["active", "disabled"].includes(status)) {
      throw new ApiError(400, "Status must be either 'active' or 'disabled'");
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) throw new ApiError(404, "Customer not found");

    customer.status = status;
    await customer.save();

    res.json({
      success: true,
      message: `Customer account status updated to ${status}`,
      status: customer.status,
    });
  })
);

module.exports = router;
