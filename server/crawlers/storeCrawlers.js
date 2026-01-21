require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");

const Product = require("../models/product.model");
const PriceHistory = require("../models/pricehistory.model");

// ✅ add
const { processAlerts } = require("../jobs/processAlerts");

// Scraper Imports
const { runAsosCrawl } = require("../scrappers/asos.scraper");
const { runBoohooCrawl } = require("../scrappers/boohoo.scraper");
const { runPltCrawl } = require("../scrappers/plt.scraper");

// --- UTILITIES ---

const sha1 = (str) => crypto.createHash("sha1").update(str).digest("hex");

const normalizeUrl = (rawUrl) => {
  try {
    const u = new URL(rawUrl);
    u.hash = "";
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "affid",
      "cmp",
      "kid",
    ].forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return rawUrl;
  }
};

const makeCanonicalKey = ({ store, productUrl }) =>
  `${store}:${sha1(normalizeUrl(productUrl))}`;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in .env");
  await mongoose.connect(process.env.MONGO_URI);
};

const isValidUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);

const isPdpUrl = (u) => {
  if (!isValidUrl(u)) return false;
  try {
    const url = new URL(u);
    const p = url.pathname.toLowerCase();
    const ok =
      p.endsWith(".html") || /\/(p|product|products|prd)\/[^/]+/.test(p);
    if (!ok) return false;

    const blocked = [
      "/sale",
      "/search",
      "/bag",
      "/cart",
      "/account",
      "/login",
      "/help",
    ];
    if (blocked.some((x) => p === x || p.startsWith(x + "/"))) return false;
    return true;
  } catch {
    return /\.html/i.test(u);
  }
};

// --- CORE LOGIC ---

const sanitizeProducts = (products = [], { storeKey, fallbackSaleUrl }) => {
  return products
    .map((p) => {
      if (!p) return null;

      const productUrl = normalizeUrl(p.productUrl);
      const saleUrl = normalizeUrl(p.saleUrl || fallbackSaleUrl);

      const out = {
        ...p,
        canonicalKey:
          p.canonicalKey || makeCanonicalKey({ store: storeKey, productUrl }),
        store: p.store || storeKey,
        storeName:
          p.storeName ||
          (storeKey === "prettylittlething" ? "PrettyLittleThing" : storeKey),
        productUrl,
        saleUrl,
        image: p.image || (p.images && p.images[0]),
        currency: p.currency || "GBP",
      };

      if (
        !out.title ||
        typeof out.price !== "number" ||
        !out.image ||
        !isPdpUrl(out.productUrl)
      ) {
        return null; // will remove this later
      }

      return out;
    })
    .filter(Boolean);
};

const upsertProducts = async (products = []) => {
  if (!products.length) return { inserted: 0, updated: 0, total: 0 };
  const now = new Date();

  const ops = products.map((p) => ({
    updateOne: {
      filter: { canonicalKey: p.canonicalKey },
      update: {
        $set: { ...p, status: "active", inStock: true, lastSeenAt: now },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const res = await Product.bulkWrite(ops, { ordered: false });
  return {
    inserted: res.upsertedCount || 0,
    updated: res.modifiedCount || 0,
    total: products.length,
  };
};

const writePriceHistoryAndDetectDrops = async ({
  products = [],
  runId,
  seenAt,
}) => {
  if (!products.length) return { historyInserted: 0, drops: 0 };

  const keys = products.map((p) => p.canonicalKey);
  const prevProducts = await Product.find(
    { canonicalKey: { $in: keys } },
    { canonicalKey: 1, price: 1 },
  ).lean();
  const prevMap = new Map(prevProducts.map((p) => [p.canonicalKey, p.price]));

  const historyDocs = products.map((p) => ({
    ...p,
    runId,
    seenAt,
    originalPrice: p.originalPrice ?? null,
  }));

  let drops = 0;
  products.forEach((p) => {
    const prevPrice = prevMap.get(p.canonicalKey);
    if (prevPrice && p.price < prevPrice) drops++;
  });

  try {
    await PriceHistory.insertMany(historyDocs, { ordered: false });
  } catch (err) {}

  return { historyInserted: historyDocs.length, drops };
};

const runStore = async ({ storeKey, crawlFn, startUrls }) => {
  const runId = `${storeKey}:${Date.now()}`;
  const seenAt = new Date();

  console.log(`\n🕵️  CRAWLING: ${storeKey}...`);
  const rawProducts = await crawlFn({ startUrls });

  const products = sanitizeProducts(rawProducts, {
    storeKey,
    fallbackSaleUrl: startUrls ? startUrls[0] : null,
  });

  const history = await writePriceHistoryAndDetectDrops({
    products,
    runId,
    seenAt,
  });
  const upsert = await upsertProducts(products);

  const seenKeys = products.map((p) => p.canonicalKey);
  const inactive = await Product.updateMany(
    { store: storeKey, status: "active", canonicalKey: { $nin: seenKeys } },
    { $set: { status: "inactive", inStock: false } },
  );

  return {
    store: storeKey,
    ...upsert,
    markedInactive: inactive.modifiedCount,
    ...history,
  };
};

const run = async () => {
  await connectDB();
  const summaries = [];

  console.log("🚀 Starting Sequential Crawl Process...");

  // 1) ✅ ASOS
  summaries.push(
    await runStore({
      storeKey: "asos",
      crawlFn: runAsosCrawl,
      startUrls: [
        "https://www.asos.com/women/sale/cat/?cid=7046",
        "https://www.asos.com/men/sale/cat/?cid=8409",
      ],
    }),
  );

  // 2) ✅ Boohoo
  summaries.push(
    await runStore({
      storeKey: "boohooman",
      crawlFn: runBoohooCrawl,
      startUrls: ["https://www.boohooman.com/mens/sale"],
    }),
  );

  // 3) ✅ PrettyLittleThing
  summaries.push(
    await runStore({
      storeKey: "prettylittlething",
      crawlFn: runPltCrawl,
      startUrls: ["https://www.prettylittlething.com/sale.html"],
    }),
  );

  console.log("\n=== STORE RUN SUMMARY ✅ ===");
  summaries.forEach((s) =>
    console.log(
      `${s.store.toUpperCase()}: Total ${s.total} | New ${s.inserted} | Updated ${s.updated} | Drops ${s.drops}`,
    ),
  );

  // ✅ process tracked alerts after products are updated
  const alertSummary = await processAlerts();
  console.log("\n=== ALERTS ✅ ===");
  console.log(
    `Checked: ${alertSummary.checked} | Triggered: ${alertSummary.triggered}`,
  );

  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error("Crawler failed ❌", err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
