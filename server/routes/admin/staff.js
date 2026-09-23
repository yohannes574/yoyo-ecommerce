const express = require("express");
const bcrypt = require("bcryptjs");
const Admin = require("../../models/Admin");
const { adminProtect } = require("../../middleware/auth");
const { ApiError, asyncHandler } = require("../../utils/apiError");
const { requirePermission, ROLES, PERMISSIONS, permissionsFor } = require("../../utils/permissions");

const router = express.Router();
router.use(adminProtect);
router.use(requirePermission("staff"));

/** GET /api/admin/staff — list staff accounts. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const staff = await Admin.find().sort({ createdAt: 1 });
    res.json({
      success: true,
      staff: staff.map((s) => ({
        ...s.toSafeJSON(),
        permissions: permissionsFor(s.role),
      })),
      roles: ROLES,
      allPermissions: PERMISSIONS,
    });
  })
);

/** POST /api/admin/staff — add a staff account. */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, email, phone, password, role } = req.body;
    if (!name?.trim() || !email?.trim() || !password) throw new ApiError(400, "Name, email and password are required");
    if (password.length < 6) throw new ApiError(400, "Password must be at least 6 characters");
    if (!ROLES.includes(role)) throw new ApiError(400, `Role must be one of: ${ROLES.join(", ")}`);
    if (role === "superadmin") throw new ApiError(400, "Only one superadmin exists. Grant 'admin' instead.");

    const exists = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (exists) throw new ApiError(400, "An account with this email already exists");

    const staff = await Admin.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || "",
      passwordHash: await bcrypt.hash(password, 10),
      role: role || "support_agent",
      active: true,
    });
    res.status(201).json({ success: true, message: `${staff.name} added as ${staff.role}`, id: staff._id });
  })
);

/** PATCH /api/admin/staff/:id — edit role / status / details. */
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const staff = await Admin.findById(req.params.id);
    if (!staff) throw new ApiError(404, "Staff account not found");
    const { name, phone, role, active } = req.body;

    if (staff.role === "superadmin" && (role || active === false)) {
      throw new ApiError(400, "The superadmin account cannot be modified");
    }
    if (role) {
      if (!ROLES.includes(role)) throw new ApiError(400, `Role must be one of: ${ROLES.join(", ")}`);
      if (role === "superadmin") throw new ApiError(400, "Cannot promote to superadmin");
      staff.role = role;
    }
    if (active !== undefined) staff.active = !!active;
    if (name?.trim()) staff.name = name.trim();
    if (phone !== undefined) staff.phone = phone.trim();

    await staff.save();
    res.json({ success: true, message: "Staff updated", staff: staff.toSafeJSON() });
  })
);

/** POST /api/admin/staff/:id/reset-password — owner resets a staff password. */
router.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const staff = await Admin.findById(req.params.id);
    if (!staff) throw new ApiError(404, "Staff account not found");
    if (staff.role === "superadmin") throw new ApiError(400, "Use change-password for the superadmin account");
    const { password } = req.body;
    if (!password || password.length < 6) throw new ApiError(400, "Password must be at least 6 characters");
    staff.passwordHash = await bcrypt.hash(password, 10);
    await staff.save();
    res.json({ success: true, message: `Password reset for ${staff.name}` });
  })
);

module.exports = router;
