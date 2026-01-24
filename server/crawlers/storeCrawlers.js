// server/scripts/runAsos.js
require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("../models/product.model");

const { runBoohooCrawl } = require("../scrappers/boohoo.scraper");
const { runAsosCrawl } = require("../scrappers/asos.scraper");

const { makeCanonicalKey } = require("../utils/canonical");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Missing MONGO_URI in .env");
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
};

const toNumber = (v) => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const guessCurrency = (raw) => {
  const s = String(raw?.currency || raw?.curr || raw?.sr || raw?.price || "");
  if (s.includes("£")) return "GBP";
  if (s.includes("$")) return "USD";
  if (s.includes("€")) return "EUR";
  return raw?.currency || null;
};

// ✅ normalize ANY store result into your Product model shape
const normalize = (raw = {}) => {
  const store = String(raw.store || raw.source || "asos").toLowerCase();

  const productUrl =
    raw.productUrl ||
    raw.url ||
    raw.link ||
    raw.href ||
    raw.product?.url ||
    null;

  // ✅ boohoo already sends canonicalKey; asos needs makeCanonicalKey
  const canonicalKey =
    raw.canonicalKey ||
    (productUrl ? makeCanonicalKey({ store, productUrl }) : null);

  const price = toNumber(raw.price ?? raw.sr);
  const originalPrice = toNumber(raw.originalPrice ?? raw.wasPrice ?? raw.rrp);

  const currency = raw.currency || guessCurrency(raw);

  const images = Array.isArray(raw.images) ? raw.images.filter(Boolean) : [];
  const image = raw.image || images[0] || null;

  return {
    canonicalKey,
    store,
    storeName:
      raw.storeName ||
      raw.sourceName ||
      (store === "boohooman" ? "BoohooMAN" : "ASOS"),
    title: raw.title || raw.name || null,
    price,
    currency,
    originalPrice: originalPrice || null,
    discountPercent:
      raw.discountPercent != null
        ? Number(raw.discountPercent)
        : originalPrice && price && originalPrice > price
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : null,
    image,
    images,
    productUrl,
    saleUrl: raw.saleUrl || null,
    category: raw.category || raw.userData?.category || null,
    gender: raw.gender || raw.userData?.gender || null,
    colors: Array.isArray(raw.colors) ? raw.colors.filter(Boolean) : [],
    sizesRaw: Array.isArray(raw.sizesRaw) ? raw.sizesRaw.filter(Boolean) : [],
    sizes: Array.isArray(raw.sizes) ? raw.sizes.filter(Boolean) : [],
    inStock: typeof raw.inStock === "boolean" ? raw.inStock : true,
    status: raw.status || "active",
    lastSeenAt: new Date(),
  };
};

const missingRequired = (doc) => {
  const m = [];
  if (!doc.canonicalKey) m.push("canonicalKey");
  if (!doc.store) m.push("store");
  if (!doc.storeName) m.push("storeName");
  if (!doc.title) m.push("title");
  if (doc.price == null) m.push("price");
  if (!doc.currency) m.push("currency");
  if (!doc.image) m.push("image");
  if (!doc.productUrl) m.push("productUrl");
  return m;
};

const upsertProducts = async (products, label = "STORE") => {
  console.log(`\n===== ${label}: ${products.length} =====`);

  const stats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
  const debug = { missingRequired: 0, noChange: 0 };

  for (const raw of products) {
    try {
      const doc = normalize(raw);
      const miss = missingRequired(doc);

      if (miss.length) {
        debug.missingRequired += 1;
        stats.skipped += 1;

        if (debug.missingRequired <= 3) {
          console.log(`⚠️ ${label} SKIP missing:`, miss, {
            title: doc.title,
            price: doc.price,
            currency: doc.currency,
            productUrl: doc.productUrl,
          });
        }
        continue;
      }

      const res = await Product.updateOne(
        { canonicalKey: doc.canonicalKey },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );

      if (res.upsertedId) stats.inserted += 1;
      else if (res.modifiedCount === 1) stats.updated += 1;
      else {
        debug.noChange += 1;
        stats.skipped += 1;
      }
    } catch (err) {
      stats.errors += 1;
      console.error(`❌ ${label} Upsert failed:`, err?.message || err);
    }
  }

  console.log(`📊 ${label} STATS:`, stats);
  console.log(`🔎 ${label} DEBUG:`, debug);

  return { stats, debug };
};

const run = async () => {
  await connectDB();

  // =========================
  // 1) BOOHOO FIRST
  // =========================
  const boohooStartUrls = [
    {
      url: "https://www.boohooman.com/mens/hoodies-sweatshirts",
      userData: { gender: "men", category: "hoodies & sweatshirts" },
    },
  ];

  const boohooProducts = await runBoohooCrawl({
    startUrls: boohooStartUrls,
    maxListPages: 1,
    debug: true,
  });

  console.log("✅ BOOHOO PRODUCTS:", boohooProducts.length);
  await upsertProducts(boohooProducts, "BOOHOO");

  // quick sanity check
  const boohooCount = await Product.countDocuments({ store: "boohooman" });
  console.log("🧾 BOOHOO docs in DB:", boohooCount);

  // =========================
  // 2) THEN ASOS
  // =========================
  const asosStartUrls = [
    {
      url: "https://www.asos.com/women/dresses/cat/?cid=8799",
      userData: { gender: "women", category: "dresses" },
    },
  ];

  const asosProducts = await runAsosCrawl({
    startUrls: asosStartUrls,
    maxListPages: 1,
    debug: true,
  });

  console.log("✅ ASOS PRODUCTS:", asosProducts.length);
  await upsertProducts(asosProducts, "ASOS");

  // quick sanity check
  const asosCount = await Product.countDocuments({ store: "asos" });
  console.log("🧾 ASOS docs in DB:", asosCount);
};

run()
  .catch((err) => {
    console.error("❌ RUN FAILED:", err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
    console.log("✅ MongoDB connection closed");
  });
