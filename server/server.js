const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config(); // fallback for root .env
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/error");

const authRoutes = require("./routes/auth");
const adminAuthRoutes = require("./routes/admin/auth");
const categoryRoutes = require("./routes/categories");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const wishlistRoutes = require("./routes/wishlist");
const addressRoutes = require("./routes/orders");
const checkoutRoutes = require("./routes/checkouts");
const ordersApiRoutes = require("./routes/orders-api");
const reviewRoutes = require("./routes/reviews");
const returnRoutes = require("./routes/returns");
const notificationRoutes = require("./routes/notifications");
const supportRoutes = require("./routes/support");
const deliveryPublicRoutes = require("./routes/delivery");

// Admin routes
const adminProductsRoutes = require("./routes/admin/products");
const adminCategoriesRoutes = require("./routes/admin/categories");
const adminOrdersRoutes = require("./routes/admin/orders");
const adminDashboardRoutes = require("./routes/admin/dashboard");
const adminInventoryRoutes = require("./routes/admin/inventory");
const adminPromosRoutes = require("./routes/admin/promos");
const adminCustomersRoutes = require("./routes/admin/customers");
const adminReviewsRoutes = require("./routes/admin/reviews");
const adminReturnsRoutes = require("./routes/admin/returns");
const adminNotificationRoutes = require("./routes/admin/notifications");
const adminSupportRoutes = require("./routes/admin/support");
const adminDeliveryRoutes = require("./routes/admin/delivery");
const adminStaffRoutes = require("./routes/admin/staff");
const adminReportsRoutes = require("./routes/admin/reports");
const adminSettingsRoutes = require("./routes/admin/settings");
const adminContentRoutes = require("./routes/admin/content");
const contentRoutes = require("./routes/content");
const paymentRoutes = require("./routes/payments");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Uploaded product images + payment receipts
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "Yoyo E-Commerce API is running!" });
});

// Customer auth
app.use("/api/auth", authRoutes);

// Public catalog
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);

// Customer account & checkout data (protected)
app.use("/api/reviews", reviewRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/delivery", deliveryPublicRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/checkouts", checkoutRoutes);
app.use("/api/orders", ordersApiRoutes);

// Admin portal API (protected)
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/products", adminProductsRoutes);
app.use("/api/admin/categories", adminCategoriesRoutes);
app.use("/api/admin/orders", adminOrdersRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/inventory", adminInventoryRoutes);
app.use("/api/admin/promos", adminPromosRoutes);
app.use("/api/admin/customers", adminCustomersRoutes);
app.use("/api/admin/reviews", adminReviewsRoutes);
app.use("/api/admin/returns", adminReturnsRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin/support", adminSupportRoutes);
app.use("/api/admin/delivery", adminDeliveryRoutes);
app.use("/api/admin/staff", adminStaffRoutes);
app.use("/api/admin/reports", adminReportsRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/admin/content", adminContentRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});