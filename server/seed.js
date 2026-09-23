/**
 * Development seed — `npm run seed`
 *
 * Recreates the catalog: super admin, categories + subcategories, sample
 * products with generated placeholder images, and promo codes.
 * Customer accounts / orders / carts are left untouched.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const connectDB = require("./config/db");
const Admin = require("./models/Admin");
const Category = require("./models/Category");
const Product = require("./models/Product");
const PromoCode = require("./models/PromoCode");
const InventoryTransaction = require("./models/InventoryTransaction");
const Counter = require("./models/Counter");
const Review = require("./models/Review");
const DeliveryZone = require("./models/DeliveryZone");
const DeliveryStaff = require("./models/DeliveryStaff");
const Setting = require("./models/Setting");

const IMG_DIR = path.join(__dirname, "uploads", "products");
const PALETTE = [
  ["#2563eb", "#1e40af"],
  ["#0891b2", "#155e75"],
  ["#059669", "#065f46"],
  ["#d97706", "#92400e"],
  ["#dc2626", "#991b1b"],
  ["#7c3aed", "#5b21b6"],
  ["#db2777", "#9d174d"],
  ["#65a30d", "#3f6212"],
  ["#64748b", "#334155"],
];

/** Write a simple branded SVG placeholder and return its URL path. */
function writeImage(index, label) {
  const [a, b] = PALETTE[index % PALETTE.length];
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const filename = `seed-${index}-${slug}.svg`;
  const words = label.split(" ");
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
  const line2 = words.slice(Math.ceil(words.length / 2)).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="100%" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <circle cx="300" cy="255" r="90" fill="rgba(255,255,255,0.18)"/>
  <text x="300" y="200" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">YOYO</text>
  <text x="300" y="265" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">${line1}</text>
  ${line2 ? `<text x="300" y="318" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">${line2}</text>` : ""}
  <text x="300" y="540" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.85)" text-anchor="middle">Product image placeholder</text>
</svg>`;
  fs.mkdirSync(IMG_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMG_DIR, filename), svg);
  return `/uploads/products/${filename}`;
}

const categoryTree = [
  {
    name: "Electronics",
    subs: ["Phones", "TVs", "Headphones", "Speakers", "Cameras"],
  },
  { name: "Computers", subs: ["Laptops", "Desktops", "Monitors", "Keyboards", "Accessories"] },
  { name: "Cosmetics", subs: ["Skincare", "Makeup", "Hair Care"] },
  { name: "Chicken Equipment", subs: ["Feeders", "Drinkers", "Incubators"] },
  { name: "Jewellery", subs: ["Rings", "Necklaces", "Bracelets"] },
  { name: "Baby Products", subs: ["Diapers", "Toys", "Baby Clothing"] },
  { name: "Sports Products", subs: ["Fitness", "Football", "Running", "Gym Equipment"] },
  { name: "Car Products", subs: ["Car Accessories", "Car Care", "Car Electronics"] },
  { name: "Women's Products", subs: ["Clothing", "Bags", "Shoes"] },
];

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const products = [
  { name: "Samsung Galaxy A55 5G 128GB", cat: "Phones", brand: "Samsung", price: 28999, stock: 25, threshold: 3, flags: { featured: true, bestSeller: true }, desc: "6.6\" Super AMOLED, 50MP camera, 5000mAh battery. Dual SIM." },
  { name: "Xiaomi Redmi Note 13 128GB", cat: "Phones", brand: "Xiaomi", price: 18999, discount: 10, stock: 40, threshold: 5, flags: { bestSeller: true }, desc: "108MP camera phone with 33W fast charging." },
  { name: "Apple iPhone 15 128GB", cat: "Phones", brand: "Apple", price: 89999, stock: 12, threshold: 2, flags: { featured: true }, desc: "A16 Bionic chip, 48MP main camera, Dynamic Island." },
  { name: "LG 43\" 4K Smart TV", cat: "TVs", brand: "LG", price: 36999, discount: 5, stock: 10, threshold: 2, flags: { featured: true }, desc: "43-inch Ultra HD smart TV with webOS and ThinQ AI." },
  { name: "JBL Tune 510BT Wireless Headphones", cat: "Headphones", brand: "JBL", price: 2999, stock: 60, threshold: 10, flags: { bestSeller: true }, desc: "Pure Bass sound, up to 40 hours battery life." },
  { name: "JBL Flip 6 Portable Speaker", cat: "Speakers", brand: "JBL", price: 5499, stock: 30, threshold: 5, desc: "Waterproof Bluetooth speaker with rich JBL sound." },
  { name: "Canon EOS 2000D DSLR Camera", cat: "Cameras", brand: "Canon", price: 62999, stock: 8, threshold: 2, desc: "24.1MP DSLR with EF-S 18-55mm kit lens." },
  { name: "HP Pavilion 15 Laptop", cat: "Laptops", brand: "HP", price: 78999, stock: 16, threshold: 3, flags: { featured: true }, desc: "Core i5, 15.6\" FHD display — configurable RAM and storage.", variants: [
    { name: "8GB RAM / 512GB SSD", price: 78999, stock: 8 },
    { name: "16GB RAM / 512GB SSD", price: 82999, stock: 5 },
    { name: "16GB RAM / 1TB SSD", price: 86999, stock: 3 },
  ] },
  { name: "Lenovo ThinkPad T14 Gen 4", cat: "Laptops", brand: "Lenovo", price: 129999, discount: 10, stock: 6, threshold: 2, desc: "Business ultrabook, Ryzen 7, 32GB RAM, 1TB SSD." },
  { name: "Dell 24\" Full HD Monitor", cat: "Monitors", brand: "Dell", price: 18999, stock: 20, threshold: 4, desc: "1920x1080 IPS panel, HDMI + VGA." },
  { name: "Logitech K380 Multi-Device Keyboard", cat: "Keyboards", brand: "Logitech", price: 3499, stock: 55, threshold: 10, flags: { bestSeller: true }, desc: "Compact Bluetooth keyboard for up to 3 devices." },
  { name: "Razer DeathAdder Essential Mouse", cat: "Accessories", brand: "Razer", price: 4499, stock: 0, threshold: 5, desc: "6400 DPI optical gaming mouse.", flags: {} },
  { name: "Nivea Soft Moisturizing Cream", cat: "Skincare", brand: "Nivea", price: 499, stock: 200, threshold: 30, desc: "Light moisturising cream for all skin types, 200ml." },
  { name: "Maybelline Superstay Matte Lipstick", cat: "Makeup", brand: "Maybelline", price: 799, stock: 90, threshold: 15, flags: { bestSeller: true }, desc: "Up to 16 hours of long-wearing matte colour." },
  { name: "L'Oréal Elvive Shampoo 400ml", cat: "Hair Care", brand: "L'Oréal", price: 699, stock: 150, threshold: 20, desc: "Total repair 5 nourishing shampoo." },
  { name: "Chicken Feeder 5kg Capacity", cat: "Feeders", brand: "Farmline", price: 850, stock: 45, threshold: 10, desc: "Durable plastic feeder that keeps feed clean and dry." },
  { name: "Automatic Poultry Drinker 10L", cat: "Drinkers", brand: "Farmline", price: 1200, stock: 30, threshold: 8, desc: "Auto-refill drinker for clean water supply." },
  { name: "Digital Egg Incubator 56 Eggs", cat: "Incubators", brand: "HatchPro", price: 15500, stock: 4, threshold: 5, flags: { featured: true }, desc: "Automatic egg turning, digital temperature control." },
  { name: "18k Gold-Plated Ring", cat: "Rings", brand: "Yoyo Gold", price: 2450, stock: 15, threshold: 3, flags: { newArrival: true }, desc: "Elegant gold-plated ring, gift box included." },
  { name: "Silver Necklace with Pendant", cat: "Necklaces", brand: "Yoyo Gold", price: 3200, stock: 12, threshold: 3, desc: "Sterling silver necklace with a crystal pendant." },
  { name: "Baby Diapers Mega Pack (60 pcs)", cat: "Diapers", brand: "BabyCare", price: 1450, stock: 300, threshold: 40, flags: { bestSeller: true }, desc: "Soft, breathable diapers with wetness indicator." },
  { name: "Soft Baby Toys Set (3 pcs)", cat: "Toys", brand: "TinyTots", price: 850, stock: 60, threshold: 10, desc: "BPA-free rattle, teether and plush toy set." },
  { name: "Adidas Adizero Running Shoes", cat: "Running", brand: "Adidas", price: 5999, discount: 15, stock: 22, threshold: 4, flags: { bestSeller: true }, desc: "Lightweight running shoes, sizes 40-45.", variants: [
    { name: "Size 40", stock: 4 },
    { name: "Size 41", stock: 5 },
    { name: "Size 42", stock: 6 },
    { name: "Size 43", stock: 4 },
    { name: "Size 44", stock: 3 },
  ] },
  { name: "Football Size 5", cat: "Football", brand: "Adidas", price: 1299, stock: 40, threshold: 8, desc: "Match-quality football for all weather conditions." },
  { name: "Dumbbell Set 20kg", cat: "Gym Equipment", brand: "IronFlex", price: 8999, stock: 7, threshold: 5, flags: { newArrival: true }, desc: "Adjustable dumbbell set with connecting bar." },
  { name: "Car Vacuum Cleaner 12V", cat: "Car Accessories", brand: "AutoPro", price: 2799, stock: 18, threshold: 4, desc: "High-suction handheld car vacuum, 12V plug." },
  { name: "Car Seat Cover Set (5 pcs)", cat: "Car Accessories", brand: "AutoPro", price: 4500, discount: 15, stock: 12, threshold: 3, desc: "Universal fit breathable seat covers." },
  { name: "Women's Leather Handbag", cat: "Bags", brand: "Yoyo Style", price: 3499, stock: 14, threshold: 3, flags: { featured: true }, desc: "Genuine leather handbag with gold hardware." },
  { name: "Women's Summer Dress", cat: "Clothing", brand: "Yoyo Style", price: 1899, stock: 25, threshold: 5, flags: { newArrival: true }, desc: "Lightweight floral summer dress, sizes S-M-L.", variants: [
    { name: "Size S", stock: 9 },
    { name: "Size M", stock: 10 },
    { name: "Size L", stock: 6 },
  ] },
  { name: "Stiletto Heels Women's Shoes", cat: "Shoes", brand: "Yoyo Style", price: 2599, discount: 10, stock: 0, threshold: 4, desc: "Classic black stiletto heels, sizes 37-41.", flags: {} },
];

async function seed() {
  try {
    await connectDB();

    console.log("Clearing catalog collections...");
    await Promise.all([
      Admin.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      PromoCode.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      Counter.deleteMany({}),
      Review.deleteMany({}),
      DeliveryZone.deleteMany({}),
      DeliveryStaff.deleteMany({}),
    ]);

    // ---- Super admin ----
    const admin = await Admin.create({
      name: "Super Admin",
      email: "admin@yoyo.com",
      phone: "+251911000000",
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "superadmin",
      active: true,
    });
    console.log(`✅ Admin: ${admin.email} / admin123`);

    // ---- Categories ----
    const catDocs = [];
    for (const [i, top] of categoryTree.entries()) {
      const parent = await Category.create({
        name: top.name,
        slug: slugify(top.name),
        description: `Shop ${top.name.toLowerCase()}`,
        order: i,
        active: true,
      });
      catDocs.push(parent);
      for (const [j, sub] of top.subs.entries()) {
        const child = await Category.create({
          name: sub,
          slug: slugify(sub),
          description: `${sub} — subcategory of ${top.name}`,
          parent: parent._id,
          order: j,
          active: true,
        });
        catDocs.push(child);
      }
    }
    console.log(`✅ ${catDocs.length} categories created (${categoryTree.length} top-level with subcategories)`);

    // ---- Products ----
    const catBySlug = new Map(catDocs.map((c) => [c.slug, c]));
    for (const [i, p] of products.entries()) {
      const cat = catBySlug.get(slugify(p.cat));
      if (!cat) {
        console.warn(`  ⚠️ Skipping "${p.name}" — category "${p.cat}" not found`);
        continue;
      }
      const sku = `YO-${String(1000 + i)}`;
      const img = writeImage(i, p.name);
      const variants = (p.variants || []).map((v) => ({
        name: v.name,
        sku: `${sku}-${v.name.replace(/[^a-z0-9]+/gi, "-")}`,
        price: v.price ?? p.price,
        stock: v.stock ?? 0,
      }));
      const product = await Product.create({
        name: p.name,
        slug: `${slugify(p.name)}-${1000 + i}`,
        sku,
        category: cat._id,
        brand: p.brand || "",
        description: p.desc || "",
        price: p.price,
        discountPercent: p.discount || 0,
        stock: p.stock,
        reserved: 0,
        lowStockThreshold: p.threshold ?? 5,
        images: [img],
        variants,
        specifications: { Category: p.cat, Brand: p.brand || "—" },
        status: "active",
        featured: !!(p.flags && p.flags.featured),
        newArrival: !!(p.flags && p.flags.newArrival),
        bestSeller: !!(p.flags && p.flags.bestSeller),
      });
      await InventoryTransaction.create({
        product: product._id,
        productName: product.name,
        sku,
        previousStock: 0,
        change: p.stock,
        newStock: p.stock,
        type: "RESTOCK",
        reason: "Initial stock (seed)",
        performedBy: admin.name,
      });
    }
    console.log(`✅ ${products.length} products created with placeholder images`);

    // ---- Promo codes ----
    const now = Date.now();
    await PromoCode.create([
      {
        code: "YOYO10",
        type: "percent",
        value: 10,
        minOrder: 500,
        maxDiscount: 1500,
        usageLimit: 0,
        usedCount: 0,
        startDate: new Date(now - 86400000),
        endDate: new Date(now + 90 * 86400000),
        active: true,
      },
      {
        code: "WELCOME50",
        type: "fixed",
        value: 50,
        minOrder: 300,
        usageLimit: 0,
        usedCount: 0,
        startDate: new Date(now - 86400000),
        endDate: new Date(now + 30 * 86400000),
        active: true,
      },
    ]);
    console.log("✅ Promo codes: YOYO10 (10% off), WELCOME50 (50 ETB off)");

    // ---- Sample reviews (approved) tied to the super admin as pseudo-author ----
    const sampleComments = [
      { rating: 5, name: "Sara T.", comment: "Exactly as described. Fast delivery and great packaging!" },
      { rating: 4, name: "Dawit M.", comment: "Good quality for the price. Delivery took a bit long but item is solid." },
      { rating: 5, name: "Hanna G.", comment: "Very happy with this purchase. Would buy again." },
      { rating: 3, name: "Yonas K.", comment: "Decent product, though the colour looks slightly different in person." },
    ];
    const seededProducts = await Product.find().limit(12).select("_id name");
    for (const [pIdx, p] of seededProducts.entries()) {
      const n = 2 + Math.floor(Math.random() * 3); // 2–4 reviews per product
      const chosen = [];
      for (let k = 0; k < n; k++) chosen.push(sampleComments[(k + pIdx) % sampleComments.length]);
      for (const c of chosen) {
        await Review.create({
          product: p._id,
          customer: admin._id,
          customerName: c.name,
          productName: p.name,
          order: admin._id, // placeholder ref; seed-only reviews
          rating: c.rating,
          comment: c.comment,
          status: "approved",
          moderatedBy: "System",
          moderatedAt: new Date(),
          verifiedPurchase: false,
        });
      }
      await Review.recalculateForProduct(p._id);
    }
    console.log(`✅ Sample reviews added to ${seededProducts.length} products`);

    // ---- Delivery zones (Addis Ababa sub-cities) + staff ----
    const addisZones = [
      ["Bole", 100, 250, "1–2"],
      ["Yeka", 100, 250, "2–3"],
      ["Kirkos", 80, 200, "1–2"],
      ["Arada", 80, 200, "1–2"],
      ["Kolfe Keranio", 120, 280, "2–3"],
      ["Nifas Silk-Lafto", 110, 260, "2–3"],
      ["Lideta", 100, 250, "2–3"],
      ["Gullele", 120, 280, "2–3"],
      ["Akaki Kaliti", 140, 300, "3–4"],
      ["Addis Ketema", 110, 260, "2–3"],
    ];
    for (const [subCity, std, exp, eta] of addisZones) {
      await DeliveryZone.create({ city: "Addis Ababa", subCity, standardFee: std, expressFee: exp, etaDays: eta, active: true });
    }
    await DeliveryZone.create({ city: "Dire Dawa", subCity: "All", standardFee: 350, expressFee: null, etaDays: "4–7", active: true });
    await DeliveryZone.create({ city: "Adama", subCity: "All", standardFee: 250, expressFee: null, etaDays: "3–5", active: true });
    await DeliveryStaff.create({ name: "Abebe Kebede", phone: "+251911111111", zone: "Bole / Kirkos", active: true });
    await DeliveryStaff.create({ name: "Marta Alemu", phone: "+251922222222", zone: "Yeka / Arada", active: true });
    await DeliveryStaff.create({ name: "Solomon Tesfaye", phone: "+251933333333", zone: "West Addis", active: true });
    console.log(`✅ ${addisZones.length + 2} delivery zones, 3 delivery staff`);

    // ---- Default settings (company + payment) ----
    await Setting.set("company", {
      name: "Yoyo E-Commerce PLC",
      phone: "+251911000000",
      email: "support@yoyo.com",
      address: "Bole Road, Addis Ababa, Ethiopia",
      social: {},
    });
    await Setting.set("payment", {
      methods: { cash_on_delivery: true, bank_transfer: true, mobile: false },
      banks: [
        { id: "cbe", name: "Commercial Bank of Ethiopia (CBE)", account: "1000 2345 6789 0", holder: "Yoyo E-Commerce PLC", branch: "Bole", instructions: "", active: true },
        { id: "awash", name: "Awash Bank", account: "0130 4876 5432 00", holder: "Yoyo E-Commerce PLC", branch: "Kazanchis", instructions: "", active: true },
        { id: "dashen", name: "Dashen Bank", account: "", holder: "", branch: "", instructions: "", active: false },
      ],
    });
    console.log("✅ Default settings (company + payment methods/banks)");

    console.log("\n🌱 Seed complete. Run `npm run dev` and log in at:");
    console.log("   Admin panel: http://localhost:5174  →  admin@yoyo.com / admin123");
    console.log("   Storefront:  http://localhost:5173");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();