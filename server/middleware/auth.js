const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const Admin = require("../models/Admin");
const { ApiError, asyncHandler } = require("../utils/apiError");
const { verifyToken } = require("../utils/token");

/** Require a valid customer token. Sets req.customer. */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authorized, please log in");
  }
  let decoded;
  try {
    decoded = verifyToken(header.split(" ")[1]);
  } catch (err) {
    throw new ApiError(401, "Session expired or invalid, please log in again");
  }
  if (decoded.role !== "customer") {
    throw new ApiError(401, "Not authorized, customer token required");
  }
  const customer = await Customer.findById(decoded.id);
  if (!customer) throw new ApiError(401, "Account no longer exists");
  if (customer.status !== "active") {
    throw new ApiError(403, "Account is deactivated. Contact support.");
  }
  req.customer = customer;
  next();
});

/** Require a valid admin token. Sets req.admin. */
const adminProtect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authorized, please log in");
  }
  let decoded;
  try {
    decoded = verifyToken(header.split(" ")[1]);
  } catch (err) {
    throw new ApiError(401, "Session expired or invalid, please log in again");
  }
  if (decoded.role !== "admin") {
    throw new ApiError(401, "Not authorized, admin token required");
  }
  const admin = await Admin.findById(decoded.id);
  if (!admin) throw new ApiError(401, "Account no longer exists");
  if (!admin.active) {
    throw new ApiError(403, "Account is deactivated. Contact the owner.");
  }
  req.admin = admin;
  next();
});

module.exports = { protect, adminProtect };