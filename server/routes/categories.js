const express = require("express");
const Category = require("../models/Category");
const { asyncHandler } = require("../utils/apiError");
const { serializeCategory } = require("../utils/serialize");

const router = express.Router();

/** GET /api/categories — top-level categories with nested children */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tops = await Category.find({ parent: null, active: true }).sort({ order: 1 });
    const childIds = tops.map((t) => t._id);
    const children = await Category.find({ parent: { $in: childIds }, active: true }).sort({
      order: 1,
    });

    const byParent = new Map();
    for (const c of children) {
      if (!byParent.has(String(c.parent))) byParent.set(String(c.parent), []);
      byParent.get(String(c.parent)).push(c);
    }

    const result = tops.map((top) => {
      const obj = top.toObject();
      obj.children = (byParent.get(String(top._id)) || []).map((c) => {
        const o = c.toObject();
        o.children = [];
        return o;
      });
      return serializeCategory(obj);
    });

    res.json({ success: true, categories: result });
  })
);

module.exports = router;