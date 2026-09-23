const express = require("express");
const Notification = require("../../models/Notification");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { asyncHandler } = require("../../utils/apiError");

const router = express.Router();
router.use(adminProtect);


/** GET /api/admin/notifications?unread=1&area= — admin notification list. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = { audience: "admin" };
    if (req.query.unread === "1") q.read = false;
    if (req.query.area && req.query.area !== "all") q.area = req.query.area;
    const [notifications, unread] = await Promise.all([
      Notification.find(q).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ audience: "admin", read: false }),
    ]);
    res.json({
      success: true,
      notifications: notifications.map((n) => ({
        id: n._id,
        type: n.type,
        area: n.area,
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

/** POST /api/admin/notifications/mark-all-read */
router.post(
  "/mark-all-read",
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { audience: "admin", read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ success: true });
  })
);

/** POST /api/admin/notifications/:id/read */
router.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await Notification.updateOne({ _id: req.params.id, audience: "admin" }, { $set: { read: true, readAt: new Date() } });
    res.json({ success: true });
  })
);

module.exports = router;
