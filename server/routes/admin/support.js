const express = require("express");
const Ticket = require("../../models/Ticket");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { ApiError, asyncHandler } = require("../../utils/apiError");
const { createCustomerNotification } = require("../../utils/notifications");

const router = express.Router();
router.use(adminProtect);

router.use("/", requirePermission("support"));

const STATUSES = ["open", "in_progress", "waiting_customer", "resolved", "closed"];

/** GET /api/admin/support?status=&search= — ticket inbox. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, search } = req.query;
    const q = {};
    if (status && STATUSES.includes(status)) q.status = status;
    if (search) {
      const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ ticketNumber: rx }, { subject: rx }, { customerName: rx }, { orderNumber: rx }];
    }
    const tickets = await Ticket.find(q).sort({ updatedAt: -1 }).limit(100);
    const countsAgg = await Ticket.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const statusCounts = {};
    STATUSES.forEach((s) => (statusCounts[s] = 0));
    countsAgg.forEach((c) => (statusCounts[c._id] = c.count));

    res.json({
      success: true,
      tickets: tickets.map((t) => ({
        id: t._id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        customerName: t.customerName,
        orderNumber: t.orderNumber,
        messageCount: t.messages.length,
        lastMessageAt: t.messages[t.messages.length - 1]?.at || t.updatedAt,
        updatedAt: t.updatedAt,
      })),
      statusCounts,
    });
  })
);

/** GET /api/admin/support/:id — full thread. */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const t = await Ticket.findById(req.params.id);
    if (!t) throw new ApiError(404, "Ticket not found");
    res.json({
      success: true,
      ticket: {
        id: t._id,
        ticketNumber: t.ticketNumber,
        customerName: t.customerName,
        customerEmail: t.customerEmail,
        orderNumber: t.orderNumber,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo,
        messages: t.messages,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      },
    });
  })
);

/** POST /api/admin/support/:id/reply — admin reply. */
router.post(
  "/:id/reply",
  asyncHandler(async (req, res) => {
    const { message, attachment } = req.body;
    if (!message || !String(message).trim()) throw new ApiError(400, "Message is required");
    const t = await Ticket.findById(req.params.id);
    if (!t) throw new ApiError(404, "Ticket not found");

    t.messages.push({
      sender: "admin",
      senderName: req.admin.name || "Support",
      message: String(message).trim(),
      attachment: attachment || undefined,
    });
    // Replying moves the ticket into waiting-for-customer
    if (t.status === "open" || t.status === "in_progress") t.status = "waiting_customer";
    await t.save();

    await createCustomerNotification({
      customerId: t.customer,
      type: "support_reply",
      title: `Support replied to ticket ${t.ticketNumber}`,
      body: t.subject,
      link: "/account/support",
    });

    res.json({ success: true, message: "Reply sent" });
  })
);

/** PATCH /api/admin/support/:id — status / priority / assignment. */
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { status, priority, assignedTo } = req.body;
    const t = await Ticket.findById(req.params.id);
    if (!t) throw new ApiError(404, "Ticket not found");
    if (status) {
      if (!STATUSES.includes(status)) throw new ApiError(400, `Status must be one of: ${STATUSES.join(", ")}`);
      t.status = status;
      if (status === "resolved" || status === "closed") {
        await createCustomerNotification({
          customerId: t.customer,
          type: "support_update",
          title: `Ticket ${t.ticketNumber} ${status}`,
          body: t.subject,
          link: "/account/support",
        });
      }
    }
    if (priority && ["low", "normal", "high"].includes(priority)) t.priority = priority;
    if (assignedTo !== undefined) t.assignedTo = String(assignedTo).trim();
    await t.save();
    res.json({ success: true, message: "Ticket updated" });
  })
);

module.exports = router;
