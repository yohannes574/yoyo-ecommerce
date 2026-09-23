# Yoyo 🛒

Single-vendor Ethiopian e-commerce platform — storefront, admin panel, and API.
Built with React (Vite) + Express + MongoDB, in plain JavaScript.

## Project structure

```
yoyo/
├── server/   # Express + Mongoose REST API (port 5000)
├── client/   # Customer storefront (port 5173)
├── admin/    # Admin panel (port 5174)
└── reference.txt  # Full system blueprint this project is built from
```

## Getting started

1. **Install dependencies**

   ```bash
   npm install            # root (concurrently)
   npm run install:all    # server + client + admin
   ```

2. **Set up the environment**

   ```bash
   cp server/.env.example server/.env
   # then edit server/.env — MONGODB_URI and JWT_SECRET are the important ones
   ```

3. **Start MongoDB** locally (default: `mongodb://127.0.0.1:27017/yoyo`)

4. **Seed the database** (admin user, categories, products, reviews, delivery zones, settings)

   ```bash
   npm run seed
   ```

5. **Run everything**

   ```bash
   npm run dev
   ```

   - Storefront: http://localhost:5173
   - Admin panel: http://localhost:5174 (admin@yoyo.com / admin123 after seeding)
   - API: http://localhost:5000

## What's implemented

**Storefront** — home (with admin-managed hero banners), shop, categories &
subcategories, search, product details with reviews & ratings, wishlist, cart,
4-step checkout (address → delivery method & promo → payment → review),
order confirmation & tracking, cancel order, request return, account portal
(dashboard, orders, addresses, notifications, support tickets, profile),
email verification & password reset, live zone-based delivery quotes.

**Admin panel** — dashboard with sales chart, orders & payment verification
(bank receipts), products with variants & images, categories tree, inventory
adjustment + history, zone-based delivery management (zones, fees, staff,
order assignment), customers, promo codes, reviews moderation, returns
processing (approve → received → refund + restock), support ticket inbox,
in-app notification center, reports (sales / products / customers) with CSV
export, staff management with roles & server-enforced permissions, homepage
content management (banners & sections), company & payment settings.

**Payments** — cash on delivery, bank transfer with receipt upload and
admin verification, and mobile money (Telebirr / CBE Birr / M-Pesa) through
a Chapa-style aggregator gateway. Without gateway credentials the mobile
money flow runs in **mock mode** (sandbox checkout page) — add
`GATEWAY_*` keys to `server/.env` and enable "Mobile Money" in admin
Settings → Payment to go live.

## Build phases

| Phase | What | Status |
|-------|------|--------|
| 1 | Repo setup — git, branding, ports/proxies, dev script, env | ✅ done |
| 2 | Server foundation — models, auth, seed data, uploads | ✅ done |
| 3 | Storefront core — home, shop, categories, search, product details, cart, wishlist | ✅ done |
| 4 | Checkout & orders — addresses, checkout, COD + bank transfer, stock reservation, tracking | ✅ done |
| 5 | Admin panel — dashboard, products, categories, inventory, orders, payments, customers, promos | ✅ done |
| 6 | Reviews & ratings — verified-purchase reviews, moderation, product ratings | ✅ done |
| 7 | Returns & refunds — request flow, evidence upload, admin processing, restock | ✅ done |
| 8 | Notifications & support — in-app notifications (customer + admin), ticket system | ✅ done |
| 9 | Delivery operations — zones & fees, staff, order assignment, free-delivery threshold | ✅ done |
| 10 | Staff roles & reports — permission map enforced server-side, CSV reports, settings, homepage CMS | ✅ done |
| 11 | Mobile money — gateway-agnostic integration (mock mode without keys), webhook verification | ✅ done |

## Roadmap ideas (v3)

Multi-language UI (Amharic, Oromo, Tigrinya, Somali), dark mode, SMS
notifications, loyalty program, customer wallet, product comparison,
advanced recommendations, recently viewed.
