const Notification = require("../models/Notification");

/**
 * Create a customer-facing notification. Never throws — notification
 * failures must not break the business flow that triggered it.
 */
const createCustomerNotification = async ({ customerId, type, title, body, link }) => {
  try {
    if (!customerId) return null;
    return await Notification.create({
      audience: "customer",
      customer: customerId,
      type: type || "system",
      title,
      body: body || "",
      link: link || "",
    });
  } catch (err) {
    console.error("Failed to create customer notification:", err.message);
    return null;
  }
};

/** Create an admin-facing notification (optionally limited to a permission area). */
const createAdminNotification = async ({ type, title, body, link, area }) => {
  try {
    return await Notification.create({
      audience: "admin",
      type: type || "system",
      title,
      body: body || "",
      link: link || "",
      area: area || null,
    });
  } catch (err) {
    console.error("Failed to create admin notification:", err.message);
    return null;
  }
};

module.exports = { createCustomerNotification, createAdminNotification };
