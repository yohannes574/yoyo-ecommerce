const express = require("express");
const bcrypt = require("bcryptjs");
const Customer = require("../models/Customer");
const { ApiError, asyncHandler } = require("../utils/apiError");
const { signToken } = require("../utils/token");
const { generateCode, codeExpiry } = require("../utils/generate");
const { sendEmail } = require("../utils/email");
const { protect } = require("../middleware/auth");

const router = express.Router();

const hashCode = (code) => bcrypt.hash(code, 10);
const matchesCode = (code, hash) => bcrypt.compare(code, hash || "");
const hashPassword = (password) => bcrypt.hash(password, 10);

/** POST /api/auth/register */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      throw new ApiError(400, "Name, email and password are required");
    }
    if (String(password).length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters");
    }
    const existing = await Customer.findOne({
      $or: [{ email: email.toLowerCase() }, ...(phone ? [{ phone }] : [])],
    });
    if (existing) {
      throw new ApiError(
        400,
        existing.email === email.toLowerCase()
          ? "An account with this email already exists"
          : "An account with this phone already exists"
      );
    }

    const customer = await Customer.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? String(phone).trim() : "",
      passwordHash: await hashPassword(password),
    });

    const token = signToken({ id: customer._id, role: "customer" });
    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      customer: customer.toSafeJSON(),
    });
  })
);

/** POST /api/auth/login */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const identifier = req.body.identifier || req.body.email || req.body.phone;
    const { password } = req.body;
    if (!identifier || !password) {
      throw new ApiError(400, "Email/phone and password are required");
    }

    const customer = await Customer.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        ...(String(identifier).includes("@") ? [] : [{ phone: String(identifier) }]),
      ],
    });
    if (!customer) throw new ApiError(401, "Incorrect credentials");

    const ok = await bcrypt.compare(password, customer.passwordHash);
    if (!ok) throw new ApiError(401, "Incorrect credentials");

    if (customer.status !== "active") {
      throw new ApiError(403, "Account is deactivated. Contact support.");
    }

    const token = signToken({ id: customer._id, role: "customer" });
    res.json({ success: true, token, customer: customer.toSafeJSON() });
  })
);

/** POST /api/auth/forgot-password */
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new ApiError(400, "Email is required");

    const customer = await Customer.findOne({ email: email.toLowerCase() });
    // Respond the same whether or not the account exists (avoid enumeration)
    if (customer) {
      const code = generateCode();
      customer.resetCodeHash = await hashCode(code);
      customer.resetCodeExpires = codeExpiry(15);
      await customer.save();
      try {
        await sendEmail({
          to: customer.email,
          subject: "Yoyo — reset your password",
          text: `Hello ${customer.name},\n\nYour password reset code is: ${code}\n\nIt expires in 15 minutes. If you did not request this, you can ignore this email.`,
        });
      } catch (err) {
        console.error("❌ Reset email failed:", err.message);
        throw new ApiError(503, "Email service is temporarily unavailable. Please try again in a few minutes.");
      }
    }
    res.json({
      success: true,
      message: "If an account exists for that email, a reset code has been sent.",
    });
  })
);

/** POST /api/auth/reset-password */
router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { email, code, password } = req.body;
    if (!email || !code || !password) {
      throw new ApiError(400, "Email, code and new password are required");
    }
    if (String(password).length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters");
    }

    const customer = await Customer.findOne({ email: email.toLowerCase() });
    if (!customer) throw new ApiError(400, "No account found for this email");

    const valid = await matchesCode(code, customer.resetCodeHash);
    if (!valid) throw new ApiError(400, "Incorrect reset code");
    if (customer.resetCodeExpires < new Date()) {
      throw new ApiError(400, "Reset code has expired. Request a new one.");
    }

    customer.passwordHash = await hashPassword(password);
    customer.resetCodeHash = undefined;
    customer.resetCodeExpires = undefined;
    await customer.save();

    res.json({ success: true, message: "Password updated. You can now log in." });
  })
);

/** GET /api/auth/me */
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    res.json({ success: true, customer: req.customer.toSafeJSON() });
  })
);

/** PATCH /api/auth/profile — update name and phone */
router.patch(
  "/profile",
  protect,
  asyncHandler(async (req, res) => {
    const { name, phone } = req.body;
    if (name) req.customer.name = name.trim();
    if (phone !== undefined) req.customer.phone = phone.trim();
    await req.customer.save();
    res.json({
      success: true,
      message: "Profile updated successfully",
      customer: req.customer.toSafeJSON(),
    });
  })
);

/** PATCH /api/auth/change-password — update password */
router.patch(
  "/change-password",
  protect,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new ApiError(400, "Current and new passwords are required");
    }
    if (String(newPassword).length < 6) {
      throw new ApiError(400, "New password must be at least 6 characters");
    }

    const ok = await bcrypt.compare(currentPassword, req.customer.passwordHash);
    if (!ok) throw new ApiError(400, "Current password is incorrect");

    req.customer.passwordHash = await hashPassword(newPassword);
    await req.customer.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  })
);

module.exports = router;