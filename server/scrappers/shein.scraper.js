// server/scrapers/shein.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const { makeCanonicalKey } = require("../utils/canonical");

const DEFAULT_START_URLS = [
  {
    url: "https://www.shein.co.uk/Women-Blouses-c-1733.html",
    userData: { gender: "women", category: "blouses" },
  },
];

const LIST_READY_SEL =
  'div.product-list-v2__container, div.product-list-v2__section, [aria-label="Product list"]';

const LIST_LINKS_SEL =
  'a[href*="-p-"][href$=".html"], a.S-product-card__img-container[href*="-p-"][href$=".html"]';

const PAGINATION_NEXT_HREF_SEL =
  'a[aria-label*="Next"][href]:not([aria-disabled="true"])';

const PAGINATION_NEXT_CLICK_SEL = [
  'span[aria-label*="Next"]:not(.sui-pagination__btn-disabled)',
  'button[aria-label*="Next"]:not([disabled])',
  'span.sui-pagination__btn[aria-label*="Next"]:not(.sui-pagination__btn-disabled)',
].join(",");

const PDP_TITLE_SEL = "h1.product-intro__head-name, h1.title-line-camp, h1";
const PDP_JSONLD_SEL = 'script[type="application/ld+json"]';
const PDP_PRICE_SEL = "#productMainPriceId, #productPriceId, #priceContainer";

const PDP_IMG_BEFORE_CROP_SEL = "[data-before-crop-src]";
const PDP_IMG_FALLBACK_SEL =
  "img[srcset], img[src], img[data-src], img[data-lazy]";

const SIZE_ITEM_SEL = "div.product-intro__size-radio";
const OUT_OF_STOCK_TEXT_RE = /out of stock|sold out|unavailable/i;

const SHEIN_IMG_HOST_RE = /1webstatic\.com/i;
const SHEIN_RISK_RE = /\/risk\/challenge/i;

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

const canonicalizeSheinPdpUrl = (rawUrl = "") => {
  try {
    const u = new URL(String(rawUrl));
    u.hash = "";
    u.search = "";

    const m = u.pathname.match(/\/[^/]*-p-\d+\.html/i);
    if (m && m[0]) u.pathname = m[0];

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

const safeInnerText = async (page, sel) => {
  try {
    const el = await page.$(sel);
    if (!el) return null;
    const t = await el.innerText();
    return (t || "").replace(/\s+/g, " ").trim() || null;
  } catch {
    return null;
  }
};

const isPdpUrl = (rawUrl = "") => {
  try {
    const u = new URL(String(rawUrl));
    return /-p-\d+\.html/i.test(u.pathname);
  } catch {
    return /-p-\d+\.html/i.test(String(rawUrl));
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
          (as || [])
            .map((a) => (a.getAttribute("href") || "").trim())
            .filter(Boolean),
        ),
      ),
    )
    .catch(() => []);

  return hrefs
    .map((h) => canonicalizeSheinPdpUrl(absolutize(h, baseUrl)))
    .filter(Boolean);
};

const tryGetNextPageUrl = async (page, baseUrl) => {
  try {
    const href = await page.getAttribute(PAGINATION_NEXT_HREF_SEL, "href");
    if (href) return absolutize(href, baseUrl);
  } catch {}

  try {
    const u = new URL(String(baseUrl));
    const cur = Number(u.searchParams.get("page") || "1");
    const next = cur + 1;
    u.searchParams.set("page", String(next));
    return u.toString();
  } catch {}

  return null;
};

const clickNextAndGetUrl = async (page) => {
  const before = page.url();

  try {
    const btn = await page.$(PAGINATION_NEXT_CLICK_SEL);
    if (!btn) return null;

    await Promise.allSettled([
      page.waitForLoadState("networkidle", { timeout: 20000 }),
      btn.click({ timeout: 8000 }),
    ]);

    await page.waitForTimeout(600);

    const after = page.url();
    if (after && after !== before) return after;
    return null;
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

const extractImages = async (page, baseUrl) => {
  const crop = await page
    .$$eval(PDP_IMG_BEFORE_CROP_SEL, (els) =>
      (els || [])
        .map((el) => (el.getAttribute("data-before-crop-src") || "").trim())
        .filter(Boolean),
    )
    .catch(() => []);

  const fallback = await page
    .$$eval(PDP_IMG_FALLBACK_SEL, (imgs) =>
      (imgs || [])
        .map((img) => {
          const cls = (img.getAttribute("class") || "").toLowerCase();
          if (cls.includes("locate-label")) return null;

          const srcset = (img.getAttribute("srcset") || "").trim();
          const src = (img.getAttribute("src") || "").trim();
          const dataSrc = (img.getAttribute("data-src") || "").trim();
          const dataLazy = (img.getAttribute("data-lazy") || "").trim();

          return { srcset, src, dataSrc, dataLazy };
        })
        .filter(Boolean),
    )
    .catch(() => []);

  const expanded = [];
  for (const u of crop) expanded.push(u);

  for (const x of fallback) {
    if (x.srcset) {
      const picked = pickLargestFromSrcset(x.srcset);
      if (picked) expanded.push(picked);
    }
    if (x.src) expanded.push(x.src);
    if (x.dataSrc) expanded.push(x.dataSrc);
    if (x.dataLazy) expanded.push(x.dataLazy);
  }

  const abs = expanded.map((u) => absolutize(u, baseUrl)).filter(Boolean);
  const filtered = abs.filter((u) => SHEIN_IMG_HOST_RE.test(String(u)));

  return Array.from(new Set(filtered));
};

const extractSizes = async (page) => {
  try {
    await page.waitForTimeout(300);

    const res = await page.evaluate(
      ({ sel }) => {
        const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
        const nodes = Array.from(document.querySelectorAll(sel));

        const items = nodes.map((n) => {
          const aria = clean(n.getAttribute("aria-label"));
          const txt = clean(n.textContent);

          const disabled =
            n.getAttribute("aria-disabled") === "true" ||
            n.getAttribute("disabled") != null ||
            (n.className || "").toLowerCase().includes("disabled");

          return { label: aria || txt || null, disabled };
        });

        const sizesRaw = items.map((x) => x.label).filter(Boolean);
        const sizes = items
          .filter((x) => !x.disabled)
          .map((x) => x.label)
          .filter(Boolean);

        return { sizesRaw, sizes };
      },
      { sel: SIZE_ITEM_SEL },
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

const extractDomPrice = async (page) => {
  const t = await safeInnerText(page, PDP_PRICE_SEL);
  const price = toNumber(t);
  let currency = null;

  const s = String(t || "");
  if (s.includes("£")) currency = "GBP";
  else if (s.includes("$")) currency = "USD";
  else if (s.includes("€")) currency = "EUR";

  return { price, currency };
};

const runSheinCrawl = async ({
  startUrls = [],
  maxListPages = 1,
  maxProducts = 0,
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

      // block obvious captcha/risk pages
      if (SHEIN_RISK_RE.test(page.url()) || SHEIN_RISK_RE.test(request.url)) {
        if (debug) console.log("🛑 SHEIN RISK/CAPTCHA:", request.url);
        return;
      }

      if (effectiveLabel === "LIST") {
        const currentPage = Number(request.userData?.page || 1);
        if (currentPage > Number(maxListPages || 1)) return;

        const links = await extractListLinks(page, request.url);

        let canonicalLinks = links
          .map((l) => canonicalizeSheinPdpUrl(l))
          .filter(Boolean);

        if (Number(maxProducts || 0) > 0) {
          canonicalLinks = canonicalLinks.slice(0, Number(maxProducts));
        }

        await enqueueLinks({
          urls: canonicalLinks,
          label: "DETAIL",
          userData: request.userData || {},
          transformRequestFunction: (req) => {
            const canon = canonicalizeSheinPdpUrl(req.url);
            return { ...req, url: canon, uniqueKey: canon };
          },
        });

        if (debug) {
          console.log(
            "🟦 SHEIN LIST extracted:",
            links.length,
            "canonical:",
            canonicalLinks.length,
            "page:",
            currentPage,
          );
        }

        if (currentPage < Number(maxListPages || 1)) {
          let nextUrl = await tryGetNextPageUrl(page, request.url);

          if (!nextUrl || nextUrl === request.url) {
            const clickedUrl = await clickNextAndGetUrl(page);
            if (clickedUrl) nextUrl = clickedUrl;
          }

          if (nextUrl && nextUrl !== request.url) {
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

            if (debug) console.log("➡️ SHEIN LIST next:", nextUrl);
          }
        }

        return;
      }

      // DETAIL
      try {
        await page.waitForSelector(PDP_TITLE_SEL, { timeout: 25000 });
      } catch {
        if (debug) console.log("❌ SHEIN DETAIL wait failed:", request.url);
        return;
      }

      if (SHEIN_RISK_RE.test(page.url())) {
        if (debug) console.log("🛑 SHEIN RISK/CAPTCHA (detail):", page.url());
        return;
      }

      const productUrl = canonicalizeSheinPdpUrl(page.url());
      const title = (await safeText(page, PDP_TITLE_SEL)) || null;

      const jsonld = await extractFromJsonLd(page);
      const domPrice = await extractDomPrice(page);

      const price = domPrice.price ?? jsonld.price ?? null;
      const currency = String(
        domPrice.currency || jsonld.currency || "GBP",
      ).toUpperCase();

      const images = await extractImages(page, productUrl);
      const image = images[0] || null;

      const sizes = await extractSizes(page);
      const inStock = sizes.hasSizes
        ? sizes.inStock
        : await inferInStockFallback(page);

      const store = "shein";
      const storeName = "SHEIN";

      // ✅ do NOT touch canonical key logic
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
        console.log("🟩 SHEIN PRODUCT_DOC_REQUIRED", {
          title: doc.title,
          price: doc.price,
          currency: doc.currency,
          inStock: doc.inStock,
          image: doc.image,
          images0: doc.images?.[0] || null,
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

module.exports = { runSheinCrawl };
