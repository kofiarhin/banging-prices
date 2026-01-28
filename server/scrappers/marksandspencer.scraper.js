// server/scrappers/marksandspencer.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const { makeCanonicalKey } = require("../utils/canonical");

const DEFAULT_START_URLS = [
  {
    url: "https://www.marksandspencer.com/l/women/jeans",
    userData: { gender: "women", category: "jeans" },
  },
];

const LIST_READY_SEL = "div.eco-box_ecoBox__50nux.grid_container";
const LIST_LINKS_SEL = 'a[href*="/p/"]';
const PAGINATION_NEXT_SEL = 'a[aria-label="Next page"]';

const PDP_TITLE_SEL = "h1";
const PDP_IMG_SEL = 'img[data-tagg="gallery-image"]';
const PDP_JSONLD_SEL = 'script[type="application/ld+json"]';

const PDP_META_PRICE_SEL =
  'meta[itemprop="price"], meta[property="product:price:amount"]';
const PDP_META_CURRENCY_SEL =
  'meta[itemprop="priceCurrency"], meta[property="product:price:currency"]';

const SIZE_LABEL_SEL = "label.selector_wrapper__nEEgL";
const COLOR_LABEL_SEL = "label.selector_withImage__Ib2VU";
const OUT_OF_STOCK_TEXT_RE = /out of stock/i;

const MS_CDN_PREFIX =
  "https://assets.digitalcontent.marksandspencer.app/images/";

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

const canonicalizeMsPdpUrl = (rawUrl = "") => {
  try {
    const u = new URL(String(rawUrl));
    u.hash = "";
    [
      "colour",
      "color",
      "selectedColour",
      "selectedColor",
      "swatch",
      "image",
      "size",
      "fit",
      "style",
    ].forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return String(rawUrl);
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

const isPdpUrl = (rawUrl = "") => {
  try {
    const u = new URL(String(rawUrl));
    return u.pathname.includes("/p/");
  } catch {
    return String(rawUrl).includes("/p/");
  }
};

const extractListLinks = async (page, baseUrl) => {
  await page
    .waitForSelector(LIST_READY_SEL, { timeout: 25000 })
    .catch(() => {});
  await page
    .waitForSelector(LIST_LINKS_SEL, { timeout: 25000 })
    .catch(() => {});

  const hrefs = await page
    .$$eval(LIST_LINKS_SEL, (as) =>
      Array.from(
        new Set(
          (as || []).map((a) => a.getAttribute("href") || "").filter(Boolean),
        ),
      ),
    )
    .catch(() => []);

  return hrefs.map((h) => absolutize(h, baseUrl)).filter(Boolean);
};

const getNextPageUrl = async (page, baseUrl) => {
  try {
    const href = await page.getAttribute(PAGINATION_NEXT_SEL, "href");
    if (!href) return null;
    return absolutize(href, baseUrl);
  } catch {
    return null;
  }
};

const extractImagesFromDom = async (page, baseUrl) => {
  try {
    const raw = await page
      .$$eval(PDP_IMG_SEL, (imgs) =>
        (imgs || [])
          .map((img) => ({
            src: (img.getAttribute("src") || "").trim(),
            srcset: (img.getAttribute("srcset") || "").trim(),
          }))
          .filter((x) => x.src || x.srcset),
      )
      .catch(() => []);

    const expanded = [];
    for (const x of raw) {
      if (x.srcset) {
        const picked = pickLargestFromSrcset(x.srcset);
        if (picked) expanded.push(picked);
      }
      if (x.src) expanded.push(x.src);
    }

    const abs = expanded.map((u) => absolutize(u, baseUrl)).filter(Boolean);

    // ✅ keep ONLY CDN images (fixes 404s)
    const cdnOnly = abs.filter((u) => String(u).startsWith(MS_CDN_PREFIX));

    return Array.from(new Set(cdnOnly));
  } catch {
    return [];
  }
};

const extractSizesFromDom = async (page) => {
  try {
    await page.waitForTimeout(300);

    const res = await page.evaluate(
      ({ sizeSel, colorSel }) => {
        const clean = (t) => (t || "").replace(/\s+/g, " ").trim();

        const labels = Array.from(document.querySelectorAll(sizeSel));
        const filtered = labels.filter((l) => !l.matches(colorSel));

        const sizesRaw = filtered
          .map((l) => clean(l.textContent))
          .filter(Boolean);

        const aria = filtered
          .map((l) => clean(l.getAttribute("aria-label")))
          .filter(Boolean);

        const merged = sizesRaw.length ? sizesRaw : aria;
        const normalized = merged.map((s) =>
          s.replace(/^waist\s+/i, "").trim(),
        );

        return { sizesRaw: normalized, sizes: normalized };
      },
      { sizeSel: SIZE_LABEL_SEL, colorSel: COLOR_LABEL_SEL },
    );

    const sizesRaw = Array.isArray(res?.sizesRaw) ? res.sizesRaw : [];
    const sizes = Array.isArray(res?.sizes) ? res.sizes : [];

    return {
      sizesRaw,
      sizes,
      hasSizes: sizesRaw.length > 0,
      inStock: sizes.length > 0,
    };
  } catch {
    return { sizesRaw: [], sizes: [], hasSizes: false, inStock: false };
  }
};

const inferInStockFallback = async (page) => {
  try {
    const txt = await page.textContent("body").catch(() => "");
    if (OUT_OF_STOCK_TEXT_RE.test(String(txt || ""))) return false;
    return true;
  } catch {
    return true;
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

const extractDomPriceFallback = async (page) => {
  try {
    const txt = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const root =
        h1?.closest("main") || document.querySelector("main") || document.body;

      const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
      const t = clean(root?.innerText || "");
      return t.slice(0, 20000);
    });

    const m = String(txt || "").match(/£\s*\d+(?:\.\d{1,2})?/);
    return { price: toNumber(m ? m[0] : null) };
  } catch {
    return { price: null };
  }
};

const runMarksAndSpencerCrawl = async ({
  startUrls = [],
  maxListPages = 1,
  maxProducts = 0, // ✅ 0 = no cap, otherwise limits PDPs enqueued per list page
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

        await page.setExtraHTTPHeaders({
          "accept-language": "en-GB,en;q=0.9",
        });

        await page.setViewportSize({ width: 1366, height: 768 });

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

        const links = await extractListLinks(page, request.url);

        let canonicalLinks = links
          .map((l) => canonicalizeMsPdpUrl(l))
          .filter(Boolean);

        // ✅ FAST TEST: only enqueue first N products
        if (Number(maxProducts || 0) > 0) {
          canonicalLinks = canonicalLinks.slice(0, Number(maxProducts));
        }

        await enqueueLinks({
          urls: canonicalLinks,
          label: "DETAIL",
          userData: request.userData || {},
          transformRequestFunction: (req) => {
            const canon = canonicalizeMsPdpUrl(req.url);
            return { ...req, url: canon, uniqueKey: canon };
          },
        });

        if (debug) {
          console.log(
            "🟦 M&S LIST extracted:",
            links.length,
            "canonical:",
            canonicalLinks.length,
            "page:",
            currentPage,
          );
        }

        if (currentPage < Number(maxListPages || 1)) {
          const nextUrl = await getNextPageUrl(page, request.url);
          if (nextUrl) {
            await enqueueLinks({
              urls: [nextUrl],
              label: "LIST",
              userData: {
                ...(request.userData || {}),
                baseUrl: request.userData?.baseUrl || request.url,
                page: currentPage + 1,
              },
              transformRequestFunction: (req) => {
                const u = req.url;
                return { ...req, url: u, uniqueKey: u };
              },
            });
            if (debug) console.log("➡️ M&S LIST next:", nextUrl);
          }
        }

        return;
      }

      try {
        await page.waitForSelector(PDP_TITLE_SEL, { timeout: 25000 });
        await page
          .waitForSelector(PDP_IMG_SEL, { timeout: 25000 })
          .catch(() => null);
      } catch {
        if (debug) console.log("❌ M&S DETAIL wait failed:", request.url);
        return;
      }

      const productUrl = canonicalizeMsPdpUrl(page.url());
      const title = (await safeText(page, PDP_TITLE_SEL)) || null;

      const metaPrice = toNumber(
        await safeAttr(page, PDP_META_PRICE_SEL, "content"),
      );
      const metaCurrency = await safeAttr(
        page,
        PDP_META_CURRENCY_SEL,
        "content",
      );

      const jsonld = await extractFromJsonLd(page);
      const domFallback = await extractDomPriceFallback(page);

      const price = metaPrice ?? jsonld.price ?? domFallback.price ?? null;
      const currency = String(
        jsonld.currency || metaCurrency || "GBP",
      ).toUpperCase();

      const images = await extractImagesFromDom(page, productUrl);
      const image = images[0] || null;

      const sizes = await extractSizesFromDom(page);
      const inStock = sizes.hasSizes
        ? sizes.inStock
        : await inferInStockFallback(page);

      const store = "marksandspencer";
      const storeName = "Marks & Spencer";
      const canonicalKey = makeCanonicalKey({ store, productUrl });

      const originalPrice = jsonld.originalPrice ?? null;
      const discountPercent =
        originalPrice && price && originalPrice > price
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : null;

      const doc = {
        canonicalKey,
        store,
        storeName,
        title,
        price,
        currency,
        originalPrice,
        discountPercent,
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
        console.log("🟩 M&S PRODUCT_DOC_REQUIRED", {
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
      uniqueKey: url,
    };
  });

  await crawler.run(seeds);

  const map = new Map();
  for (const p of results) map.set(p.canonicalKey, p);

  return Array.from(map.values());
};

module.exports = { runMarksAndSpencerCrawl };
