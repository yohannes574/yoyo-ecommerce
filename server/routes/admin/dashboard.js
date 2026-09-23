const express = require("express");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const Customer = require("../../models/Customer");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { asyncHandler } = require("../../utils/apiError");

const router = express.Router();
router.use(adminProtect);

/**
 * GET /api/admin/dashboard/metrics
 * Complete metrics, revenue, status breakdown, alerts, and recent orders
 */
router.get(
  "/metrics",
  asyncHandler(async (req, res) => {
    // 1. Total Revenue from paid/delivered orders
    const revenueAgg = await Order.aggregate([
      {
        $match: {
          $or: [{ "payment.status": "paid" }, { orderStatus: "delivered" }],
          orderStatus: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    // 2. Orders status breakdown
    const orderStatusAgg = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      ready_for_delivery: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    };
    let totalOrders = 0;
    orderStatusAgg.forEach((item) => {
      if (item._id && statusCounts[item._id] !== undefined) {
        statusCounts[item._id] = item.count;
      }
      totalOrders += item.count;
    });

    // 3. Pending receipt verifications
    const pendingReceipts = await Order.countDocuments({
      "payment.status": "pending_verification",
    });

    // 4. Total Customers
    const totalCustomers = await Customer.countDocuments();

    // 5. Product stock alerts
    const outOfStockCount = await Product.countDocuments({ stock: { $lte: 0 } });
    const lowStockCount = await Product.countDocuments({
      $expr: {
        $and: [
          { $gt: ["$stock", 0] },
          { $lte: ["$stock", "$lowStockThreshold"] },
        ],
      },
    });

    // 6. Low stock products alert list
    const lowStockProducts = await Product.find({
      $expr: {
        $lte: ["$stock", "$lowStockThreshold"],
      },
    })
      .select("name sku stock lowStockThreshold price images category")
      .populate("category", "name slug")
      .sort({ stock: 1 })
      .limit(8);

    // 7. Recent orders
    const recentOrders = await Order.find()
      .populate("customer", "name email phone")
      .sort({ createdAt: -1 })
      .limit(8);

    // 8. Sales trend for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyRevenueAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          orderStatus: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build complete daily timeline mapping
    const salesTimeline = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const match = dailyRevenueAgg.find((item) => item._id === dateStr);
      salesTimeline.push({
        date: dateStr,
        revenue: match ? match.revenue : 0,
        orders: match ? match.orders : 0,
      });
    }

    res.json({
      success: true,
      metrics: {
        totalRevenue,
        totalOrders,
        pendingReceipts,
        totalCustomers,
        outOfStockCount,
        lowStockCount,
        statusCounts,
      },
      salesTimeline,
      lowStockProducts: lowStockProducts.map((p) => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        price: p.price,
        image: p.images?.[0] || "",
        category: p.category?.name || "Uncategorized",
        isOutOfStock: p.stock <= 0,
      })),
      recentOrders: recentOrders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        customerName: o.customer?.name || o.address?.fullName || "Customer",
        customerPhone: o.customer?.phone || o.address?.phone || "",
        total: o.total,
        orderStatus: o.orderStatus,
        paymentStatus: o.payment.status,
        paymentMethod: o.payment.method,
        createdAt: o.createdAt,
      })),
    });
  })
);

module.exports = router;
