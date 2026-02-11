// server/crawlers/storeCrawlers.js
require("dotenv").config();

process.env.CRAWLEE_SYSTEM_INFO_V2 = process.env.CRAWLEE_SYSTEM_INFO_V2 ?? "0";

const mongoose = require("mongoose");
const Product = require("../models/product.model");

const { makeCanonicalKey } = require("../utils/canonical");

// ✅ JD Sports crawler (RUN FIRST)
const { runJdSportsCrawl } = require("../scrappers/jdsports.scraper");

// ✅ Footasylum crawler
const { runFootasylumCrawl } = require("../scrappers/footasylum.scraper");

// ✅ River Island crawler
const { runRiverIslandCrawl } = require("../scrappers/riverisland.scraper");

// ✅ NIKE crawler
const { runNikeCrawl } = require("../scrappers/nike.scraper");

// ✅ Boohoo crawler
const { runBoohooCrawl } = require("../scrappers/boohoo.scraper");

// ✅ ASOS crawler
const { runAsosCrawl } = require("../scrappers/asos.scraper");

// --------------------
// ✅ SAFETY: hard timeout + graceful shutdown
// --------------------
const HARD_TIMEOUT_MINUTES = Number(
  process.env.CRAWL_HARD_TIMEOUT_MINUTES || 55,
);

const hardTimeout = setTimeout(
  () => {
    console.error(
      `⏳ Hard timeout hit (${HARD_TIMEOUT_MINUTES}m). Forcing exit.`,
    );
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  },
  HARD_TIMEOUT_MINUTES * 60 * 1000,
);

// don't keep the process alive because of the timeout timer
hardTimeout.unref();

let shuttingDown = false;

const shutdown = async (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    if (mongoose.connection?.readyState === 1) {
      await mongoose.connection.close().catch(() => {});
    }
  } finally {
    console.log("✅ MongoDB connection closed");
    // eslint-disable-next-line no-process-exit
    process.exit(code);
  }
};

// Heroku sends SIGTERM on dyno stop
process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

process.on("unhandledRejection", (reason) => {
  console.error("❌ UNHANDLED REJECTION:", reason);
  shutdown(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
  shutdown(1);
});

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
  if (u.includes("jdsports.co.uk")) return "jdsports";
  if (u.includes("boohooman.com")) return "boohooman";
  if (u.includes("asos.com")) return "asos";
  if (u.includes("nike.com")) return "nike";
  if (u.includes("riverisland.com")) return "riverisland";
  if (u.includes("footasylum.com")) return "footasylum";
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
    (store === "boohooman"
      ? "GBP"
      : store === "nike"
        ? "GBP"
        : store === "riverisland"
          ? "GBP"
          : store === "footasylum"
            ? "GBP"
            : store === "jdsports"
              ? "GBP"
              : null);

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
            : store === "riverisland"
              ? "River Island"
              : store === "footasylum"
                ? "Footasylum"
                : store === "jdsports"
                  ? "JD Sports"
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

  // ---------- JD SPORTS (FIRST) ----------
  const jdSportsProducts = await runJdSportsCrawl({
    startUrls: [
      {
        url: "https://www.jdsports.co.uk/women/womens-footwear/trainers/",
        userData: { gender: "women", category: "trainers" },
      },
      {
        url: "https://www.jdsports.co.uk/men/mens-footwear/trainers/",
        userData: { gender: "men", category: "trainers" },
      },
      {
        url: "https://www.jdsports.co.uk/kids/kids-footwear/trainers/",
        userData: { gender: "kids", category: "trainers" },
      },
      {
        url: "https://www.jdsports.co.uk/women/womens-footwear/running-shoes/",
        userData: { gender: "women", category: "running-shoes" },
      },
      {
        url: "https://www.jdsports.co.uk/men/mens-footwear/running-shoes/",
        userData: { gender: "men", category: "running-shoes" },
      },
      {
        url: "https://www.jdsports.co.uk/women/womens-footwear/gym-shoes/",
        userData: { gender: "women", category: "gym-shoes" },
      },
      {
        url: "https://www.jdsports.co.uk/men/mens-footwear/gym-shoes/",
        userData: { gender: "men", category: "gym-shoes" },
      },
    ],
    maxListPages: 2,
    debug: true,
  });

  await upsertProducts(jdSportsProducts, "JD_SPORTS");

  // ---------- FOOTASYLUM ----------
  const footasylumProducts = await runFootasylumCrawl({
    startUrls: [
      // ----- MEN -----
      {
        url: "https://www.footasylum.com/mens/mens-clothing/jackets-coats/",
        userData: { gender: "men", category: "jackets-coats" },
      },
      {
        url: "https://www.footasylum.com/mens/mens-clothing/hoodies/",
        userData: { gender: "men", category: "hoodies" },
      },
      {
        url: "https://www.footasylum.com/mens/mens-clothing/tracksuits/",
        userData: { gender: "men", category: "tracksuits" },
      },
      {
        url: "https://www.footasylum.com/mens/mens-clothing/jog-track-pants/",
        userData: { gender: "men", category: "jog-track-pants" },
      },
      {
        url: "https://www.footasylum.com/mens/mens-footwear/trainers/",
        userData: { gender: "men", category: "trainers" },
      },

      // ----- WOMEN -----
      {
        url: "https://www.footasylum.com/womens/womens-clothing/jackets-coats/",
        userData: { gender: "women", category: "jackets-coats" },
      },
      {
        url: "https://www.footasylum.com/womens/womens-clothing/hoodies/",
        userData: { gender: "women", category: "hoodies" },
      },
      {
        url: "https://www.footasylum.com/womens/womens-clothing/tracksuits/",
        userData: { gender: "women", category: "tracksuits" },
      },
      {
        url: "https://www.footasylum.com/womens/womens-clothing/activewear/",
        userData: { gender: "women", category: "activewear" },
      },
      {
        url: "https://www.footasylum.com/womens/womens-footwear/trainers/",
        userData: { gender: "women", category: "trainers" },
      },
      {
        url: "https://www.footasylum.com/womens/womens-clothing/tops/",
        userData: { gender: "women", category: "tops" },
      },

      // ----- KIDS (POWER SEGMENTS ONLY) -----
      {
        url: "https://www.footasylum.com/kids/kids-footwear/trainers/",
        userData: { gender: "kids", category: "trainers" },
      },
      {
        url: "https://www.footasylum.com/kids/kids-clothing/jackets-coats/",
        userData: { gender: "kids", category: "jackets-coats" },
      },
      {
        url: "https://www.footasylum.com/kids/kids-clothing/hoodies/",
        userData: { gender: "kids", category: "hoodies" },
      },
    ],
    maxListPages: 2,
    debug: true,
  });

  await upsertProducts(footasylumProducts, "FOOTASYLUM");

  // ---------- RIVER ISLAND ----------
  const riverIslandProducts = await runRiverIslandCrawl({
    startUrls: [
      // women
      {
        url: "https://www.riverisland.com/c/women/tops?f-cat=hoodies&f-cat=sweatshirts",
        userData: { gender: "women", category: "hoodies-sweatshirts" },
      },
      {
        url: "https://www.riverisland.com/c/women/coats-and-jackets",
        userData: { gender: "women", category: "coats-jackets" },
      },
      {
        url: "https://www.riverisland.com/c/women/jeans",
        userData: { gender: "women", category: "jeans" },
      },
      {
        url: "https://www.riverisland.com/c/women/shoes-and-boots?f-cat=shoes",
        userData: { gender: "women", category: "shoes" },
      },
      {
        url: "https://www.riverisland.com/c/women/shoes-and-boots?f-cat=trainers",
        userData: { gender: "women", category: "trainers" },
      },

      // men
      {
        url: "https://www.riverisland.com/c/men/hoodies-and-sweatshirts",
        userData: { gender: "men", category: "hoodies-sweatshirts" },
      },
      {
        url: "https://www.riverisland.com/c/men/coats-and-jackets",
        userData: { gender: "men", category: "coats-jackets" },
      },
      {
        url: "https://www.riverisland.com/c/men/jeans",
        userData: { gender: "men", category: "jeans" },
      },
      {
        url: "https://www.riverisland.com/c/men/shoes-and-boots?f-cat=shoes",
        userData: { gender: "men", category: "shoes" },
      },
      {
        url: "https://www.riverisland.com/c/men/shoes-and-boots?f-cat=trainers",
        userData: { gender: "men", category: "trainers" },
      },

      // kids (starter set)
      {
        url: "https://www.riverisland.com/c/kids-and-baby/girls",
        userData: { gender: "kids", category: "girls" },
      },
      {
        url: "https://www.riverisland.com/c/kids-and-baby/boys",
        userData: { gender: "kids", category: "boys" },
      },
      {
        url: "https://www.riverisland.com/c/kids-and-baby/baby",
        userData: { gender: "kids", category: "baby" },
      },
    ],
    maxListPages: 2,
    debug: true,
  });

  await upsertProducts(riverIslandProducts, "RIVER_ISLAND");

  // ---------- NIKE ----------
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

  return true;
};

run()
  .then(() => shutdown(0))
  .catch((err) => {
    console.error("❌ RUN FAILED:", err?.message || err);
    shutdown(1);
  });
