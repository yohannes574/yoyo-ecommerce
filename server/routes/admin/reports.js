const express = require("express");
const Order = require("../../models/Order");
const Customer = require("../../models/Customer");
const Product = require("../../models/Product");
const Return = require("../../models/Return");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { ApiError, asyncHandler } = require("../../utils/apiError");

const router = express.Router();
router.use(adminProtect);
router.use(requirePermission("reports"));

const RANGES = ["today", "yesterday", "7d", "30d", "month", "last_month", "custom"];

function rangeToDates(range, from, to) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "7d":
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case "30d":
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "last_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: first, end: last };
    }
    case "custom":
      if (!from || !to) throw new ApiError(400, "from and to are required for a custom range");
      return { start: new Date(from), end: new Date(new Date(to).setHours(23, 59, 59, 999)) };
    default:
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

const validOrdersFilter = {
  orderStatus: { $ne: "cancelled" },
};

/** GET /api/admin/reports/sales?range=&from=&to=&format=csv */
router.get(
  "/sales",
  asyncHandler(async (req, res) => {
    const { start, end } = rangeToDates(req.query.range, req.query.from, req.query.to);
    const match = { ...validOrdersFilter, createdAt: { $gte: start, $lte: end } };

    const [totals] = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
          avgOrder: { $avg: "$total" },
          discounts: { $sum: "$discount" },
          deliveryRevenue: { $sum: "$deliveryFee" },
        },
      },
    ]);

    const daily = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const byMethod = await Order.aggregate([
      { $match: match },
      { $group: { _id: "$payment.method", revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
    ]);

    const data = {
      range: req.query.range || "30d",
      start,
      end,
      totals: {
        revenue: totals?.revenue || 0,
        orders: totals?.orders || 0,
        avgOrder: Math.round(totals?.avgOrder || 0),
        discounts: totals?.discounts || 0,
        deliveryRevenue: totals?.deliveryRevenue || 0,
      },
      daily,
      byMethod,
    };

    if (req.query.format === "csv") {
      const rows = [["date", "revenue_etb", "orders"], ...daily.map((d) => [d._id, d.revenue, d.orders])];
      return sendCsv(res, `sales-report-${data.range}.csv`, rows);
    }
    res.json({ success: true, ...data });
  })
);

/** GET /api/admin/reports/products?range=&from=&to=&format=csv */
router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const { start, end } = rangeToDates(req.query.range, req.query.from, req.query.to);
    const match = { ...validOrdersFilter, createdAt: { $gte: start, $lte: end } };

    const products = await Order.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          sku: { $first: "$items.sku" },
          unitsSold: { $sum: "$items.qty" },
          revenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 50 },
    ]);

    const live = await Product.find()
      .select("name sku stock price")
      .sort({ stock: 1 })
      .limit(50);
    const stockRows = live.map((p) => ({
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      isLow: p.stock <= 5,
    }));

    if (req.query.format === "csv") {
      const rows = [
        ["product", "sku", "units_sold", "revenue_etb"],
        ...products.map((p) => [p.name, p.sku || "", p.unitsSold, p.revenue]),
      ];
      return sendCsv(res, `product-report-${req.query.range || "30d"}.csv`, rows);
    }

    res.json({
      success: true,
      bestSellers: products,
      lowStock: stockRows.filter((p) => p.isLow),
      outOfStock: stockRows.filter((p) => p.stock <= 0),
    });
  })
);

/** GET /api/admin/reports/customers?range=&from=&to=&format=csv */
router.get(
  "/customers",
  asyncHandler(async (req, res) => {
    const { start, end } = rangeToDates(req.query.range, req.query.from, req.query.to);

    const newCustomers = await Customer.countDocuments({ createdAt: { $gte: start, $lte: end } });
    const totalCustomers = await Customer.countDocuments({});

    const spenders = await Order.aggregate([
      { $match: { ...validOrdersFilter, createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$customer",
          totalSpent: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 },
    ]);
    const populated = await Customer.populate(spenders, { path: "_id", select: "name email phone" });

    if (req.query.format === "csv") {
      const rows = [
        ["customer", "email", "phone", "orders", "total_spent_etb"],
        ...populated.map((c) => [
          c._id?.name || "—",
          c._id?.email || "",
          c._id?.phone || "",
          c.orders,
          c.totalSpent,
        ]),
      ];
      return sendCsv(res, `customer-report-${req.query.range || "30d"}.csv`, rows);
    }

    res.json({
      success: true,
      newCustomers,
      totalCustomers,
      topCustomers: populated.map((c) => ({
        id: c._id?._id,
        name: c._id?.name,
        email: c._id?.email,
        phone: c._id?.phone,
        orders: c.orders,
        totalSpent: c.totalSpent,
      })),
    });
  })
);

/** GET /api/admin/reports/delivery?range=&from=&to= */
router.get(
  "/delivery",
  asyncHandler(async (req, res) => {
    const { start, end } = rangeToDates(req.query.range, req.query.from, req.query.to);
    const match = { createdAt: { $gte: start, $lte: end } };

    const byStatus = await Order.aggregate([
      { $match: match },
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]);

    const returnsAgg = await Return.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$refundAmount" } } },
    ]);

    res.json({ success: true, byStatus, returns: returnsAgg });
  })
);

function sendCsv(res, filename, rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + csv);
}

module.exports = router;
