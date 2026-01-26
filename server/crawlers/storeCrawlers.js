// server/crawlers/storeCrawlers.js
require("dotenv").config();

process.env.CRAWLEE_SYSTEM_INFO_V2 = process.env.CRAWLEE_SYSTEM_INFO_V2 ?? "0";

const mongoose = require("mongoose");
const Product = require("../models/product.model");

const { makeCanonicalKey } = require("../utils/canonical");

// ✅ Boohoo crawler
const { runBoohooCrawl } = require("../scrappers/boohoo.scraper");

// ✅ ASOS crawler
const { runAsosCrawl } = require("../scrappers/asos.scraper");

// ✅ NIKE crawler
const { runNikeCrawl } = require("../scrappers/nike.scraper");

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

const inferStoreFromUrl = (url = "") => {
  const u = String(url).toLowerCase();
  if (u.includes("boohooman.com")) return "boohooman";
  if (u.includes("asos.com")) return "asos";
  if (u.includes("nike.com")) return "nike";
  return null;
};

const normalize = (raw = {}) => {
  const productUrl =
    raw.productUrl ||
    raw.url ||
    raw.link ||
    raw.href ||
    raw.product?.url ||
    null;

  const store = String(
    raw.store || raw.source || inferStoreFromUrl(productUrl) || "unknown",
  ).toLowerCase();

  const canonicalKey =
    raw.canonicalKey ||
    (productUrl && store !== "unknown"
      ? makeCanonicalKey({ store, productUrl })
      : null);

  const price = toNumber(raw.price ?? raw.sr);
  const originalPrice = toNumber(raw.originalPrice ?? raw.wasPrice ?? raw.rrp);

  const currency =
    raw.currency ||
    guessCurrency(raw) ||
    (store === "boohooman" ? "GBP" : store === "nike" ? "GBP" : null);

  const images = Array.isArray(raw.images) ? raw.images.filter(Boolean) : [];
  const image = raw.image || images[0] || null;

  return {
    canonicalKey,
    store,
    storeName:
      raw.storeName ||
      raw.sourceName ||
      (store === "boohooman"
        ? "BoohooMAN"
        : store === "asos"
          ? "ASOS"
          : store === "nike"
            ? "Nike"
            : "Unknown"),
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
            store: doc.store,
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
        { $set: doc },
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
};

const run = async () => {
  await connectDB();

  // ---------- NIKE (FIRST) ----------
  const nikeProducts = await runNikeCrawl({
    startUrls: [
      // men
      {
        url: "https://www.nike.com/gb/w/mens-lifestyle-shoes-13jrmznik1zy7ok",
        userData: { gender: "men", category: "lifestyle-shoes" },
      },
      {
        url: "https://www.nike.com/gb/w/mens-running-shoes-37v7jznik1zy7ok",
        userData: { gender: "men", category: "running-shoes" },
      },

      // women
      {
        url: "https://www.nike.com/gb/w/womens-lifestyle-shoes-13jrmz5e1x6zy7ok",
        userData: { gender: "women", category: "lifestyle-shoes" },
      },
      {
        url: "https://www.nike.com/gb/w/womens-running-shoes-37v7jz5e1x6zy7ok",
        userData: { gender: "women", category: "running-shoes" },
      },

      // kids
      {
        url: "https://www.nike.com/gb/w/kids-lifestyle-shoes-13jrmzv4dhzy7ok",
        userData: { gender: "kids", category: "lifestyle-shoes" },
      },
      {
        url: "https://www.nike.com/gb/w/kids-running-shoes-37v7jzv4dhzy7ok",
        userData: { gender: "kids", category: "running-shoes" },
      },
    ],
    maxListPages: 2,
    debug: true,
  });

  await upsertProducts(nikeProducts, "NIKE");

  // ---------- BOOHOO ----------
  const boohooProducts = await runBoohooCrawl({
    startUrls: [
      {
        url: "https://www.boohooman.com/mens/hoodies-sweatshirts",
        userData: { gender: "men", category: "hoodies-sweatshirts" },
      },
      {
        url: "https://www.boohooman.com/mens/coats-jackets",
        userData: { gender: "men", category: "coats-jackets" },
      },
      {
        url: "https://www.boohooman.com/mens/tracksuits",
        userData: { gender: "men", category: "tracksuits" },
      },
      {
        url: "https://www.boohooman.com/mens/joggers",
        userData: { gender: "men", category: "joggers" },
      },
    ],
    maxListPages: 3,
    debug: true,
  });

  await upsertProducts(boohooProducts, "BOOHOO");

  // ---------- ASOS ----------
  const asosProducts = await runAsosCrawl({
    startUrls: [
      // women
      {
        url: "https://www.asos.com/women/dresses/cat/?cid=8799",
        userData: { gender: "women", category: "dresses" },
      },
      {
        url: "https://www.asos.com/women/tops/cat/?cid=4169",
        userData: { gender: "women", category: "tops" },
      },
      {
        url: "https://www.asos.com/women/co-ords/cat/?cid=19632",
        userData: { gender: "women", category: "co-ords" },
      },
      {
        url: "https://www.asos.com/women/coats-jackets/cat/?cid=2641",
        userData: { gender: "women", category: "coats-jackets" },
      },
      {
        url: "https://www.asos.com/women/jeans/cat/?cid=3630",
        userData: { gender: "women", category: "jeans" },
      },
      {
        url: "https://www.asos.com/women/skirts/cat/?cid=2639",
        userData: { gender: "women", category: "skirts" },
      },
      {
        url: "https://www.asos.com/women/jumpers-cardigans/cat/?cid=2637",
        userData: { gender: "women", category: "jumpers-cardigans" },
      },
      {
        url: "https://www.asos.com/women/shoes/trainers/cat/?cid=6456",
        userData: { gender: "women", category: "trainers" },
      },
      {
        url: "https://www.asos.com/women/shoes/boots/cat/?cid=6455",
        userData: { gender: "women", category: "boots" },
      },

      // men
      {
        url: "https://www.asos.com/men/t-shirts-vests/cat/?cid=7616",
        userData: { gender: "men", category: "t-shirts-vests" },
      },
      {
        url: "https://www.asos.com/men/hoodies-sweatshirts/cat/?cid=5668",
        userData: { gender: "men", category: "hoodies-sweatshirts" },
      },
      {
        url: "https://www.asos.com/men/jackets-coats/cat/?cid=3606",
        userData: { gender: "men", category: "jackets-coats" },
      },
      {
        url: "https://www.asos.com/men/jeans/cat/?cid=4208",
        userData: { gender: "men", category: "jeans" },
      },
      {
        url: "https://www.asos.com/men/trousers-chinos/cat/?cid=4910",
        userData: { gender: "men", category: "trousers-chinos" },
      },
      {
        url: "https://www.asos.com/men/shoes-boots-trainers/trainers/cat/?cid=5775",
        userData: { gender: "men", category: "trainers" },
      },
      {
        url: "https://www.asos.com/men/shoes-boots-trainers/smart-shoes/cat/?cid=5773",
        userData: { gender: "men", category: "smart-shoes" },
      },
    ],
    maxListPages: 3,
    debug: true,
  });

  await upsertProducts(asosProducts, "ASOS");

  const total = await Product.countDocuments({});
  console.log("🧾 total product docs in DB:", total);
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
