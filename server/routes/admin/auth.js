const express = require("express");
const bcrypt = require("bcryptjs");
const Admin = require("../../models/Admin");
const { ApiError, asyncHandler } = require("../../utils/apiError");
const { signToken } = require("../../utils/token");
const { adminProtect } = require("../../middleware/auth");
const { permissionsFor } = require("../../utils/permissions");

const router = express.Router();

/** POST /api/admin/auth/login */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new ApiError(400, "Email and password are required");

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) throw new ApiError(401, "Incorrect credentials");
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) throw new ApiError(401, "Incorrect credentials");
    if (!admin.active) {
      throw new ApiError(403, "Account is deactivated. Contact the owner.");
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = signToken({ id: admin._id, role: "admin" });
    res.json({ success: true, token, admin: admin.toSafeJSON(), permissions: permissionsFor(admin.role) });
  })
);

/** GET /api/admin/auth/me */
router.get(
  "/me",
  adminProtect,
  asyncHandler(async (req, res) => {
    res.json({ success: true, admin: req.admin.toSafeJSON(), permissions: permissionsFor(req.admin.role) });
  })
);

module.exports = router;