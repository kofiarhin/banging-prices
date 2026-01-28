// server/scrappers/riverisland.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const { makeCanonicalKey } = require("../utils/canonical");

const DEFAULT_START_URLS = [
  {
    url: "https://www.riverisland.com/c/women/tops?f-cat=hoodies&f-cat=sweatshirts",
    userData: { gender: "women", category: "hoodies-sweatshirts" },
  },
];

const LIST_READY_SEL = 'a[href^="/p/"], a[href*="/p/"]';
const LIST_LINKS_SEL = 'a[href^="/p/"], a[href*="/p/"]';

const PDP_ROOT_SEL = 'section[data-cs-override-id="product-details"]';
const PDP_TITLE_SEL = `${PDP_ROOT_SEL} h1`;

const PDP_SIZE_LI_SEL = 'li[data-qa="size-box"]';

const PDP_JSONLD_SEL = 'script[type="application/ld+json"]';
const PDP_META_PRICE_SEL =
  'meta[itemprop="price"], meta[property="product:price:amount"]';
const PDP_META_CURRENCY_SEL =
  'meta[itemprop="priceCurrency"], meta[property="product:price:currency"]';

const PDP_PRICE_SEL = 'p[data-qa="price"]';
const PDP_PRICE_CURRENT_SEL = `${PDP_PRICE_SEL} span.price__current-price`;

const PDP_IMG_SEL = `${PDP_ROOT_SEL} img[src], ${PDP_ROOT_SEL} img[srcset]`;

const toNumber = (val) => {
  if (val == null) return null;
  const n = Number(String(val).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const absolutize = (u, base) => {
  if (!u) return null;
  const s = String(u).trim();
  if (!s) return null;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("http")) return s;
  try {
    return new URL(s, base).toString();
  } catch {
    return s;
  }
};

const pickLargestFromSrcset = (srcset = "") => {
  const parts = String(srcset)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let bestUrl = null;
  let bestW = -1;

  for (const p of parts) {
    const [url, wRaw] = p.split(/\s+/);
    if (!url) continue;
    const w = Number(String(wRaw || "").replace(/[^\d]/g, ""));
    const score = Number.isFinite(w) ? w : 0;
    if (score > bestW) {
      bestW = score;
      bestUrl = url;
    }
  }

  return bestUrl || null;
};

const safeText = async (page, sel) => {
  try {
    const el = await page.$(sel);
    if (!el) return null;
    const t = await el.textContent();
    return (t || "").replace(/\s+/g, " ").trim() || null;
  } catch {
    return null;
  }
};

const safeAttr = async (page, sel, attr) => {
  try {
    const el = await page.$(sel);
    if (!el) return null;
    const v = await el.getAttribute(attr);
    return (v || "").trim() || null;
  } catch {
    return null;
  }
};

const extractFromJsonLd = async (page) => {
  const out = { price: null, currency: null, originalPrice: null };

  try {
    const blocks = await page.$$eval(PDP_JSONLD_SEL, (els) =>
      els
        .map((e) => (e.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 10),
    );

    for (const raw of blocks) {
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch {
        continue;
      }

      const nodes = Array.isArray(data) ? data : [data];

      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;

        const offers = node.offers;
        const offerArr = Array.isArray(offers)
          ? offers
          : offers
            ? [offers]
            : [];

        for (const o of offerArr) {
          if (!o || typeof o !== "object") continue;

          const p = toNumber(o.price ?? o.priceSpecification?.price ?? null);
          const c = o.priceCurrency || null;

          if (p != null && p > 0 && out.price == null) out.price = p;
          if (c && !out.currency) out.currency = c;

          const high = toNumber(o.highPrice ?? null);
          const low = toNumber(o.lowPrice ?? null);

          if (high != null && high > 0 && out.originalPrice == null) {
            if (out.price != null && high > out.price) out.originalPrice = high;
          } else if (low != null && low > 0 && out.originalPrice == null) {
            if (out.price != null && low > out.price) out.originalPrice = low;
          }
        }
      }

      if (out.price != null && out.currency) break;
    }
  } catch {}

  return out;
};

const extractDomPrices = async (page) => {
  try {
    await page
      .waitForSelector(PDP_PRICE_SEL, { timeout: 12000 })
      .catch(() => null);

    const res = await page.evaluate(() => {
      const root = document.querySelector(
        'section[data-cs-override-id="product-details"]',
      );
      const priceWrap = document.querySelector('p[data-qa="price"]');

      const clean = (t) => (t || "").replace(/\s+/g, " ").trim();

      const current =
        clean(
          document.querySelector('p[data-qa="price"] span.price__current-price')
            ?.textContent,
        ) ||
        clean(priceWrap?.textContent) ||
        clean(root?.textContent);

      if (!current) return { priceText: null, wasText: null };

      const priceMatch =
        current.match(/£\s*\d+(?:\.\d{1,2})?/i) ||
        current.match(/\b\d+(?:\.\d{1,2})?\s*GBP\b/i);

      const wasMatch =
        current.match(/Was\s*(£\s*\d+(?:\.\d{1,2})?)/i) ||
        current.match(/Was\s*(\d+(?:\.\d{1,2})?)/i);

      return {
        priceText: priceMatch ? priceMatch[0] : null,
        wasText: wasMatch ? wasMatch[1] || wasMatch[0] : null,
      };
    });

    return {
      price: toNumber(res?.priceText),
      originalPrice: toNumber(res?.wasText),
    };
  } catch {
    return { price: null, originalPrice: null };
  }
};

const extractImagesFromDom = async (page, baseUrl) => {
  try {
    const urls = await page.evaluate(
      ({ imgSel }) => {
        const imgs = Array.from(document.querySelectorAll(imgSel));
        const out = [];

        for (const img of imgs) {
          const srcset = img.getAttribute("srcset") || "";
          const src = img.getAttribute("src") || "";
          if (srcset) out.push(`SRCSET:${srcset}`);
          if (src) out.push(`SRC:${src}`);
        }

        return out;
      },
      { imgSel: PDP_IMG_SEL },
    );

    const expanded = [];

    for (const u of urls) {
      if (u.startsWith("SRCSET:")) {
        const picked = pickLargestFromSrcset(u.replace(/^SRCSET:/, ""));
        if (picked) expanded.push(picked);
      } else if (u.startsWith("SRC:")) {
        expanded.push(u.replace(/^SRC:/, ""));
      }
    }

    const abs = expanded
      .map((u) => absolutize(u, baseUrl))
      .filter(Boolean)
      .filter((u) => String(u).includes("images.riverisland.com/image/upload"));

    return Array.from(new Set(abs));
  } catch {
    return [];
  }
};

const extractSizesFromDom = async (page) => {
  try {
    await page
      .waitForSelector(PDP_SIZE_LI_SEL, { timeout: 12000 })
      .catch(() => null);

    const res = await page.$$eval(PDP_SIZE_LI_SEL, (items) => {
      const clean = (t) => (t || "").replace(/\s+/g, " ").trim();

      const parsed = items
        .map((li) => {
          const btn = li.querySelector('[role="button"]') || li;
          const text = clean(btn.textContent);
          if (!text) return null;

          const disabled =
            btn.getAttribute("aria-disabled") === "true" ||
            btn.hasAttribute("disabled") ||
            li.getAttribute("aria-disabled") === "true" ||
            li.hasAttribute("disabled");

          return { text, disabled };
        })
        .filter(Boolean);

      const sizesRaw = parsed.map((i) => i.text);
      const sizes = parsed.filter((i) => !i.disabled).map((i) => i.text);

      return { sizesRaw, sizes };
    });

    return {
      sizesRaw: res?.sizesRaw || [],
      sizes: res?.sizes || [],
      inStock: (res?.sizes || []).length > 0,
      hasSizes: (res?.sizesRaw || []).length > 0,
    };
  } catch {
    return { sizesRaw: [], sizes: [], inStock: false, hasSizes: false };
  }
};

const inferInStockFallback = async (page) => {
  try {
    const outOfStockVisible = await page
      .locator("text=/out of stock/i")
      .first()
      .isVisible()
      .catch(() => false);

    if (outOfStockVisible) return false;

    const addBtn = page.locator('button:has-text("Add to bag")').first();
    const hasAddBtn = await addBtn.count().catch(() => 0);

    if (hasAddBtn) {
      const disabled = await addBtn.isDisabled().catch(() => false);
      return !disabled;
    }

    return true;
  } catch {
    return true;
  }
};

const isPdpUrl = (rawUrl = "") => {
  try {
    const u = new URL(String(rawUrl));
    return u.pathname.includes("/p/");
  } catch {
    return String(rawUrl).includes("/p/");
  }
};

const loadAllListItems = async (
  page,
  { maxScrolls = 50, stableRounds = 5, waitMs = 900 } = {},
) => {
  let stable = 0;
  let lastCount = 0;

  await page
    .waitForSelector(LIST_READY_SEL, { timeout: 25000 })
    .catch(() => {});

  for (let i = 0; i < maxScrolls; i += 1) {
    const count = await page
      .locator(LIST_LINKS_SEL)
      .count()
      .catch(() => 0);

    if (count <= lastCount) stable += 1;
    else stable = 0;

    lastCount = count;

    const noMore = await page
      .locator("text=/No more results/i")
      .first()
      .isVisible()
      .catch(() => false);

    if (noMore || stable >= stableRounds) break;

    await page.mouse.wheel(0, 2400);
    await page.waitForTimeout(waitMs);
  }

  const hrefs = await page
    .$$eval(LIST_LINKS_SEL, (as) =>
      Array.from(
        new Set(
          (as || []).map((a) => a.getAttribute("href") || "").filter(Boolean),
        ),
      ),
    )
    .catch(() => []);

  return hrefs;
};

const runRiverIslandCrawl = async ({
  startUrls = [],
  maxListPages = 1,
  debug = false,
} = {}) => {
  const results = [];

  const crawler = new PlaywrightCrawler({
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 180,
    navigationTimeoutSecs: 60,
    maxRequestRetries: 2,

    launchContext: {
      launchOptions: {
        headless: true,
        timeout: 60000,
        args: [
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-blink-features=AutomationControlled",
        ],
      },
    },

    browserPoolOptions: { maxOpenPagesPerBrowser: 1 },

    preNavigationHooks: [
      async ({ page }) => {
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);

        await page.route("**/*", async (route) => {
          const type = route.request().resourceType();
          if (type === "media" || type === "font") return route.abort();
          return route.continue();
        });
      },
    ],

    async requestHandler({ page, request, enqueueLinks }) {
      const label = (request.label || "LIST").toUpperCase();
      const effectiveLabel = isPdpUrl(request.url) ? "DETAIL" : label;

      if (effectiveLabel === "LIST") {
        const currentPage = Number(request.userData?.page || 1);
        if (currentPage > Number(maxListPages || 1)) return;

        const hrefs = await loadAllListItems(page);
        const absLinks = hrefs
          .map((h) => absolutize(h, request.url))
          .filter(Boolean);

        await enqueueLinks({
          urls: absLinks,
          label: "DETAIL",
          userData: request.userData || {},
        });

        if (debug) console.log("🟦 RI LIST extracted:", absLinks.length);

        return;
      }

      // DETAIL
      try {
        await page.waitForSelector(PDP_ROOT_SEL, { timeout: 25000 });
        await page
          .waitForSelector(PDP_TITLE_SEL, { timeout: 25000 })
          .catch(() => null);
        await page
          .waitForSelector(PDP_PRICE_SEL, { timeout: 12000 })
          .catch(() => null);
      } catch {
        if (debug) console.log("❌ RI DETAIL wait failed:", request.url);
        return;
      }

      const productUrl = page.url();

      const title =
        (await safeText(page, PDP_TITLE_SEL)) ||
        (await safeText(page, "h1")) ||
        null;

      const jsonld = await extractFromJsonLd(page);

      const metaPrice = toNumber(
        await safeAttr(page, PDP_META_PRICE_SEL, "content"),
      );
      const metaCurrency = await safeAttr(
        page,
        PDP_META_CURRENCY_SEL,
        "content",
      );

      const domPrices = await extractDomPrices(page);

      const price = metaPrice ?? jsonld.price ?? domPrices.price ?? null;
      const originalPrice =
        jsonld.originalPrice ?? domPrices.originalPrice ?? null;

      const currency = String(
        jsonld.currency || metaCurrency || "GBP",
      ).toUpperCase();

      const images = await extractImagesFromDom(page, productUrl);
      const image = images[0] || null;

      const sizes = await extractSizesFromDom(page);
      const inStock = sizes.hasSizes
        ? sizes.inStock
        : await inferInStockFallback(page);

      const store = "riverisland";
      const storeName = "River Island";
      const canonicalKey = makeCanonicalKey({ store, productUrl });

      const doc = {
        canonicalKey,
        store,
        storeName,
        title,
        price,
        currency,
        originalPrice: originalPrice || null,
        discountPercent:
          originalPrice && price && originalPrice > price
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : null,
        image,
        images,
        productUrl,
        saleUrl: request.userData?.baseUrl || null,
        category: request.userData?.category || null,
        gender: request.userData?.gender || null,
        colors: [],
        sizesRaw: sizes.sizesRaw,
        sizes: sizes.sizes,
        inStock,
        status: "active",
        lastSeenAt: new Date(),
      };

      if (debug) {
        console.log("🟩 RI PRODUCT_DOC_REQUIRED", {
          title: doc.title,
          price: doc.price,
          currency: doc.currency,
          inStock: doc.inStock,
          image: doc.image,
          images0: doc.images?.[0] || null,
          images1: doc.images?.[1] || null,
          sizes0: doc.sizes?.[0] || null,
          sizesCount: doc.sizes?.length || 0,
          productUrl: doc.productUrl,
        });
      }

      results.push(doc);
    },
  });

  const finalStartUrls = (startUrls || []).length
    ? startUrls
    : DEFAULT_START_URLS;

  const seeds = finalStartUrls.filter(Boolean).map((u) => {
    const url = typeof u === "string" ? u : u.url;
    const userData = typeof u === "string" ? {} : u.userData || {};
    return {
      url,
      label: "LIST",
      userData: { ...userData, baseUrl: url, page: 1 },
    };
  });

  await crawler.run(seeds);

  const map = new Map();
  for (const p of results) map.set(p.canonicalKey, p);

  return Array.from(map.values());
};

module.exports = { runRiverIslandCrawl };
