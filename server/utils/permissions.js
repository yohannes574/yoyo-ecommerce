/**
 * Role-based permission map, enforced server-side by `requirePermission`.
 * `superadmin` has every permission implicitly.
 */
const ROLES = [
  "superadmin",
  "admin",
  "product_manager",
  "order_manager",
  "inventory_manager",
  "payment_manager",
  "delivery_manager",
  "support_agent",
  "marketing_manager",
];

const PERMISSIONS = [
  "orders",      // view + manage orders
  "products",    // view + manage products
  "categories",
  "inventory",
  "payments",    // verify/reject bank receipts, refunds
  "customers",
  "promos",
  "reviews",
  "returns",
  "delivery",
  "support",
  "reports",
  "staff",       // manage staff accounts & roles
  "settings",
  "content",
];

const ROLE_PERMISSIONS = {
  superadmin: PERMISSIONS,
  admin: PERMISSIONS,
  product_manager: ["products", "categories", "inventory", "reviews", "reports"],
  order_manager: ["orders", "returns", "customers", "reports"],
  inventory_manager: ["inventory", "products", "reports"],
  payment_manager: ["payments", "orders", "reports"],
  delivery_manager: ["delivery", "orders", "reports"],
  support_agent: ["support", "orders", "customers"],
  marketing_manager: ["promos", "content", "products", "reports"],
};

/** Does this role hold the permission? */
const roleHas = (role, permission) => {
  if (role === "superadmin" || role === "admin") return true;
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
};

const permissionsFor = (role) => {
  if (role === "superadmin" || role === "admin") return PERMISSIONS;
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Express middleware factory: enforce a permission on an admin route.
 * Must run after `adminProtect` (requires req.admin).
 */
const requirePermission = (permission) => (req, res, next) => {
  if (!req.admin) return res.status(401).json({ success: false, message: "Not authorized" });
  if (roleHas(req.admin.role, permission)) return next();
  return res.status(403).json({
    success: false,
    message: `Your role (${req.admin.role}) does not allow this action`,
  });
};

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS, roleHas, permissionsFor, requirePermission };
