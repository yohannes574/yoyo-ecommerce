/** Unit price for a product, taking an optional variant override into account. */
const unitPrice = (product, variant) => {
  const base = variant && variant.price ? variant.price : product.price;
  return base;
};

/** Sale price after the product's discountPercent. */
const salePrice = (product, variant) => {
  const base = unitPrice(product, variant);
  const disc = product.discountPercent || 0;
  return disc > 0 ? Math.round(base * (1 - disc / 100)) : base;
};

/** Available quantity for a product (or its variant when one is chosen). */
const availableFor = (product, variant) => {
  if (variant) return Math.max(0, variant.stock || 0);
  return Math.max(0, (product.stock || 0) - (product.reserved || 0));
};

const serializeCategory = (cat) => ({
  id: cat._id,
  name: cat.name,
  slug: cat.slug,
  description: cat.description,
  image: cat.image,
  parent: cat.parent,
  children: (cat.children || []).map(serializeCategory),
});

const serializeProduct = (product) => {
  const category = product.category
    ? { id: product.category._id || product.category, name: product.category.name, slug: product.category.slug }
    : null;
  return {
    id: product._id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    brand: product.brand,
    description: product.description,
    price: product.price,
    discountPercent: product.discountPercent || 0,
    salePrice: salePrice(product),
    stock: product.stock,
    reserved: product.reserved,
    available: availableFor(product),
    lowStock: product.isLowStock ? product.isLowStock() : product.stock > 0 && product.stock <= (product.lowStockThreshold || 5),
    outOfStock: product.isOutOfStock ? product.isOutOfStock() : product.stock <= 0,
    images: product.images || [],
    variants: (product.variants || []).map((v) => ({
      id: v._id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
    })),
    specifications: Object.fromEntries((product.specifications || new Map()).entries()),
    status: product.status,
    ratingAvg: product.ratingAvg || 0,
    ratingCount: product.ratingCount || 0,
    featured: product.featured,
    newArrival: product.newArrival,
    bestSeller: product.bestSeller,
    category,
    createdAt: product.createdAt,
  };
};

module.exports = { serializeCategory, serializeProduct, unitPrice, salePrice, availableFor };

/** Safely serialize the customer-facing address. */
const serializeAddress = (a) => ({
  id: a._id,
  label: a.label,
  fullName: a.fullName,
  phone: a.phone,
  region: a.region,
  city: a.city,
  subCity: a.subCity,
  woreda: a.woreda,
  address: a.address,
  deliveryInstructions: a.deliveryInstructions,
  isDefault: !!a.isDefault,
  createdAt: a.createdAt,
});

module.exports = { serializeCategory, serializeProduct, serializeAddress, unitPrice, salePrice, availableFor };