const express = require("express");
const Notification = require("../models/Notification");
const { protect, adminProtect } = require("../middleware/auth");
const { ApiError, asyncHandler } = require("../utils/apiError");

const router = express.Router();

/** GET /api/notifications — customer's notifications with unread count. */
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const [notifications, unread] = await Promise.all([
      Notification.find({ audience: "customer", customer: req.customer._id })
        .sort({ createdAt: -1 })
        .limit(50),
      Notification.countDocuments({ audience: "customer", customer: req.customer._id, read: false }),
    ]);
    res.json({
      success: true,
      notifications: notifications.map((n) => ({
        id: n._id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt,
      })),
      unread,
    });
  })
);

/** POST /api/notifications/mark-all-read — customer. */
router.post(
  "/mark-all-read",
  protect,
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { audience: "customer", customer: req.customer._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ success: true });
  })
);

/** POST /api/notifications/:id/read — customer. */
router.post(
  "/:id/read",
  protect,
  asyncHandler(async (req, res) => {
    const n = await Notification.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!n) throw new ApiError(404, "Notification not found");
    n.read = true;
    n.readAt = new Date();
    await n.save();
    res.json({ success: true });
  })
);

/** DELETE /api/notifications/:id — customer. */
router.delete(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    await Notification.deleteOne({ _id: req.params.id, customer: req.customer._id });
    res.json({ success: true });
  })
);

module.exports = router;
