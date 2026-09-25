const express = require("express");
const Ticket = require("../models/Ticket");
const { protect } = require("../middleware/auth");
const { uploadReceipt } = require("../middleware/upload");
const { ApiError, asyncHandler } = require("../utils/apiError");
const { createAdminNotification } = require("../utils/notifications");
const { uploadBuffer } = require("../utils/cloudinaryUpload");
const router = express.Router();
router.use(protect);

/** POST /api/support/upload-attachment — upload a ticket attachment. */
router.post(
  "/upload-attachment",
  uploadReceipt.single("attachment"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "No file uploaded");
    }

    const result = await uploadBuffer(
      req.file.buffer,
      "yoyo-ecommerce/support"
    );

    res.json({
      success: true,
      url: result.secure_url,
    });
  })
);

/** GET /api/support — customer's own tickets. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tickets = await Ticket.find({ customer: req.customer._id }).sort({ updatedAt: -1 });
    res.json({
      success: true,
      tickets: tickets.map(serializeTicket),
    });
  })
);

/** GET /api/support/:id — customer's own ticket detail. */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const t = await Ticket.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!t) throw new ApiError(404, "Ticket not found");
    res.json({ success: true, ticket: serializeTicket(t) });
  })
);

/** POST /api/support — create a ticket. */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { subject, category, message, orderNumber, attachment } = req.body;
    if (!subject || !String(subject).trim()) throw new ApiError(400, "Subject is required");
    if (!message || !String(message).trim()) throw new ApiError(400, "Message is required");

    const t = await Ticket.create({
      ticketNumber: await Ticket.nextTicketNumber(),
      customer: req.customer._id,
      customerName: req.customer.name || "Customer",
      customerEmail: req.customer.email || "",
      orderNumber: orderNumber ? String(orderNumber).trim() : "",
      subject: String(subject).trim().slice(0, 200),
      category: ["orders", "payments", "delivery", "returns", "product", "account", "other"].includes(category)
        ? category
        : "other",
      status: "open",
      messages: [
        {
          sender: "customer",
          senderName: req.customer.name || "Customer",
          message: String(message).trim(),
          attachment: attachment || undefined,
        },
      ],
    });

    await createAdminNotification({
      type: "new_ticket",
      area: "support",
      title: `New support ticket ${t.ticketNumber}`,
      body: `${t.subject} — from ${t.customerName}`,
      link: `/support`,
    });

    res.status(201).json({
      success: true,
      message: `Ticket ${t.ticketNumber} created. Our support team will reply soon.`,
      ticket: serializeTicket(t),
    });
  })
);

/** POST /api/support/:id/reply — customer reply. */
router.post(
  "/:id/reply",
  asyncHandler(async (req, res) => {
    const { message, attachment } = req.body;
    if (!message || !String(message).trim()) throw new ApiError(400, "Message is required");
    const t = await Ticket.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!t) throw new ApiError(404, "Ticket not found");
    if (["closed", "resolved"].includes(t.status))
      throw new ApiError(400, "This ticket is closed. Please open a new ticket.");

    t.messages.push({
      sender: "customer",
      senderName: req.customer.name || "Customer",
      message: String(message).trim(),
      attachment: attachment || undefined,
    });
    t.status = "open";
    await t.save();

    await createAdminNotification({
      type: "ticket_reply",
      area: "support",
      title: `Customer replied to ${t.ticketNumber}`,
      body: t.subject,
      link: `/support`,
    });

    res.json({ success: true, ticket: serializeTicket(t) });
  })
);

function serializeTicket(t) {
  return {
    id: t._id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    category: t.category,
    status: t.status,
    priority: t.priority,
    orderNumber: t.orderNumber,
    messages: t.messages.map((m) => ({
      id: m._id,
      sender: m.sender,
      senderName: m.senderName,
      message: m.message,
      attachment: m.attachment,
      at: m.at,
    })),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

module.exports = router;
