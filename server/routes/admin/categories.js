const express = require("express");
const Category = require("../../models/Category");
const Product = require("../../models/Product");
const { adminProtect } = require("../../middleware/auth");
const { requirePermission } = require("../../utils/permissions");
const { uploadProductImages } = require("../../middleware/upload");
const { ApiError, asyncHandler } = require("../../utils/apiError");

const router = express.Router();
router.use(adminProtect);

router.use("/", requirePermission("categories"));

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * GET /api/admin/categories
 * List all categories with product counts and parent information
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await Category.find().sort({ order: 1, name: 1 }).populate("parent", "name slug");

    // Compute product counts for each category
    const productCounts = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    productCounts.forEach((item) => {
      if (item._id) countMap[item._id.toString()] = item.count;
    });

    const result = categories.map((cat) => ({
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image: cat.image || "",
      parent: cat.parent
        ? { id: cat.parent._id, name: cat.parent.name, slug: cat.parent.slug }
        : null,
      order: cat.order || 0,
      active: cat.active !== false,
      productCount: countMap[cat._id.toString()] || 0,
      createdAt: cat.createdAt,
    }));

    res.json({
      success: true,
      categories: result,
    });
  })
);

/**
 * POST /api/admin/categories/upload
 * Upload category image or icon
 */
router.post(
  "/upload",
  uploadProductImages.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No image file uploaded");

    res.json({
      success: true,
      url: `/uploads/products/${req.file.filename}`,
    });
  })
);

/**
 * GET /api/admin/categories/:id
 * Single category details
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id).populate("parent", "name slug");
    if (!category) throw new ApiError(404, "Category not found");

    const productCount = await Product.countDocuments({ category: category._id });

    res.json({
      success: true,
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        image: category.image || "",
        parent: category.parent
          ? { id: category.parent._id, name: category.parent.name, slug: category.parent.slug }
          : null,
        order: category.order || 0,
        active: category.active !== false,
        productCount,
        createdAt: category.createdAt,
      },
    });
  })
);

/**
 * POST /api/admin/categories
 * Create a new category
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, slug, description, parent, image, order = 0, active = true } = req.body;

    if (!name || !name.trim()) throw new ApiError(400, "Category name is required");

    let baseSlug = slug ? slugify(slug) : slugify(name);
    let finalSlug = baseSlug;
    let count = 1;
    while (await Category.findOne({ slug: finalSlug })) {
      finalSlug = `${baseSlug}-${count++}`;
    }

    let parentId = null;
    if (parent) {
      const parentDoc = await Category.findById(parent);
      if (!parentDoc) throw new ApiError(400, "Specified parent category does not exist");
      parentId = parentDoc._id;
    }

    const category = await Category.create({
      name: name.trim(),
      slug: finalSlug,
      description: description?.trim() || "",
      parent: parentId,
      image: image || "",
      order: parseInt(order, 10) || 0,
      active: active !== false,
    });

    const populated = await Category.findById(category._id).populate("parent", "name slug");

    res.status(201).json({
      success: true,
      category: {
        id: populated._id,
        name: populated.name,
        slug: populated.slug,
        description: populated.description,
        image: populated.image,
        parent: populated.parent
          ? { id: populated.parent._id, name: populated.parent.name, slug: populated.parent.slug }
          : null,
        order: populated.order,
        active: populated.active,
        productCount: 0,
      },
    });
  })
);

/**
 * PUT /api/admin/categories/:id
 * Update category
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new ApiError(404, "Category not found");

    const { name, slug, description, parent, image, order, active } = req.body;

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (image !== undefined) category.image = image;
    if (order !== undefined) category.order = parseInt(order, 10) || 0;
    if (active !== undefined) category.active = !!active;

    if (parent !== undefined) {
      if (!parent || parent === "" || parent === null) {
        category.parent = null;
      } else {
        if (parent.toString() === category._id.toString()) {
          throw new ApiError(400, "A category cannot be its own parent");
        }
        const parentDoc = await Category.findById(parent);
        if (!parentDoc) throw new ApiError(400, "Specified parent category does not exist");
        category.parent = parentDoc._id;
      }
    }

    if (slug && slug !== category.slug) {
      const cleanSlug = slugify(slug);
      const existing = await Category.findOne({ slug: cleanSlug, _id: { $ne: category._id } });
      if (existing) throw new ApiError(400, `Slug '${cleanSlug}' is already in use`);
      category.slug = cleanSlug;
    }

    await category.save();
    const populated = await Category.findById(category._id).populate("parent", "name slug");
    const productCount = await Product.countDocuments({ category: category._id });

    res.json({
      success: true,
      category: {
        id: populated._id,
        name: populated.name,
        slug: populated.slug,
        description: populated.description,
        image: populated.image,
        parent: populated.parent
          ? { id: populated.parent._id, name: populated.parent.name, slug: populated.parent.slug }
          : null,
        order: populated.order,
        active: populated.active,
        productCount,
      },
    });
  })
);

/**
 * DELETE /api/admin/categories/:id
 * Delete category with safety check on child categories & products
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new ApiError(404, "Category not found");

    // Check for child subcategories
    const childCount = await Category.countDocuments({ parent: category._id });
    if (childCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete category '${category.name}' because it contains ${childCount} subcategories. Please reassign or delete them first.`
      );
    }

    // Check for associated products
    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete category '${category.name}' because ${productCount} products belong to it. Please reassign those products first.`
      );
    }

    await Category.deleteOne({ _id: category._id });

    res.json({
      success: true,
      message: `Category '${category.name}' deleted successfully`,
    });
  })
);

module.exports = router;
