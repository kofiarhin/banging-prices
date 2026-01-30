const { PlaywrightCrawler } = require("crawlee");
const { makeCanonicalKey } = require("../utils/canonical");

const DEFAULT_START_URLS = [
  {
    url: "https://www.jdsports.co.uk/women/womens-footwear/trainers/",
    userData: { gender: "women", category: "trainers" },
  },
];

const LIST_READY_SEL = "#productListMain";
const LIST_LINKS_SEL = 'a.itemImage[href^="/product/"]';
const PAGINATION_NEXT_SEL = "#productListPagination a[rel='next']";

const PDP_TITLE_SEL = '#productItemTitle h1[data-e2e="product-name"]';
const PDP_TITLE_FALLBACK_SEL = 'h1[itemprop="name"]';

const PDP_PRICE_SEL = 'span.pri[data-e2e="product-price"]';

const PDP_IMG_MED_SEL = "img#imgMed.imgMed, img.imgMed";
const PDP_PICTURE_SRCSET_SEL = "picture source[srcset]";

// sizes container shown in your DOM: div#sizeOptions.sizeOptions...
const SIZE_OPTIONS_CONTAINER_SEL = "#sizeOptions";
const SIZE_BTN_SEL = `${SIZE_OPTIONS_CONTAINER_SEL} button[data-e2e="pdp-productDetails-size"], button[data-e2e="pdp-productDetails-size"]`;

const JD_IMG_CDN_PREFIX = "https://i8.amplience.net/";
const OUT_OF_STOCK_TEXT_RE = /out of stock|sold out/i;

const toNumber = (val) => {
  if (val == null) return null;
  const n = Number(String(val).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const absolutize = (u, base) => {
  if (!u) return null;
  const s = String(u).replace(/\s+/g, "").trim(); // ✅ strip inner whitespace (fixes broken fmt/ft tokens)
  if (!s) return null;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("http")) return s;
  try {
    return new URL(s, base).toString();
  } catch {
    return s;
  }
};

const isPdpUrl = (rawUrl = "") => {
  try {
    const u = new URL(String(rawUrl));
    return u.pathname.includes("/product/");
  } catch {
    return String(rawUrl).includes("/product/");
  }
};

const canonicalizeJdUrl = (rawUrl = "") => {
  try {
    const u = new URL(String(rawUrl));
    u.hash = "";
    u.search = ""; // strip tracking/pagination (from)
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

// ✅ FIX: only keep PDP gallery images (/i/jpl/), prefer 1200w, de-dupe by image key
const extractImagesFromDom = async (page, baseUrl) => {
  try {
    const urls = [];

    const srcsets = await page
      .$$eval(PDP_PICTURE_SRCSET_SEL, (sources) =>
        (sources || [])
          .map((s) => (s.getAttribute("srcset") || "").trim())
          .filter(Boolean),
      )
      .catch(() => []);

    for (const ss of srcsets) {
      const picked = pickLargestFromSrcset(ss);
      if (picked) urls.push(picked);
    }

    const imgSrc = await page
      .$$eval(PDP_IMG_MED_SEL, (imgs) =>
        (imgs || [])
          .map((img) => (img.getAttribute("src") || "").trim())
          .filter(Boolean),
      )
      .catch(() => []);

    urls.push(...imgSrc);

    const abs = urls
      .map((u) => absolutize(String(u || "").trim(), baseUrl))
      .filter(Boolean);

    const onlyGallery = abs.filter((u) => {
      const s = String(u);
      return s.startsWith(JD_IMG_CDN_PREFIX) && s.includes("/i/jpl/");
    });

    const keyOf = (u) => {
      const m = String(u).match(/\/i\/jpl\/(jd_[^?]+)/i);
      return m ? m[1].toLowerCase() : String(u).toLowerCase();
    };

    const scoreOf = (u) =>
      /[?&]w=1200\b/.test(u) ? 2 : /[?&]w=750\b/.test(u) ? 1 : 0;

    const bestByKey = new Map();
    for (const u of onlyGallery) {
      const key = keyOf(u);
      const prev = bestByKey.get(key);
      if (!prev || scoreOf(u) > scoreOf(prev)) bestByKey.set(key, u);
    }

    const entries = Array.from(bestByKey.entries());
    entries.sort((a, b) => {
      const ka = a[0];
      const kb = b[0];
      const sa = (ka.match(/_([a-z])$/i) || [])[1] || "";
      const sb = (kb.match(/_([a-z])$/i) || [])[1] || "";
      if (sa && sb) return sa.localeCompare(sb);
      return ka.localeCompare(kb);
    });

    return entries.map(([, url]) => url);
  } catch {
    return [];
  }
};

const extractSizesFromDom = async (page) => {
  const parse = async () => {
    const res = await page.evaluate((sel) => {
      const clean = (t) => (t || "").replace(/\s+/g, " ").trim();

      const btns = Array.from(document.querySelectorAll(sel));

      const sizesRaw = [];
      const sizes = [];

      for (const b of btns) {
        const size = clean(b.getAttribute("data-size"));
        if (!size) continue;

        sizesRaw.push(size);

        // ✅ JD: stockcheckeravailable is unreliable. Use disabled state.
        const ariaDisabled = clean(b.getAttribute("aria-disabled")) === "true";
        const attrDisabled = b.hasAttribute("disabled");
        const propDisabled = Boolean(b.disabled);
        const classDisabled = (b.className || "")
          .toLowerCase()
          .includes("disabled");

        const isDisabled =
          propDisabled || attrDisabled || ariaDisabled || classDisabled;

        if (!isDisabled) sizes.push(size);
      }

      return {
        sizesRaw,
        sizes,
        hasSizes: sizesRaw.length > 0,
        inStock: sizes.length > 0,
      };
    }, SIZE_BTN_SEL);

    return {
      sizesRaw: Array.isArray(res?.sizesRaw) ? res.sizesRaw : [],
      sizes: Array.isArray(res?.sizes) ? res.sizes : [],
      hasSizes: Boolean(res?.hasSizes),
      inStock: Boolean(res?.inStock),
    };
  };

  try {
    // JD often lazy-renders the size block; force it into view first
    await page.evaluate(() =>
      window.scrollTo(0, Math.floor(window.innerHeight * 0.9)),
    );
    await page.waitForTimeout(250);

    // wait for container if it exists
    await page
      .waitForSelector(SIZE_OPTIONS_CONTAINER_SEL, { timeout: 12000 })
      .catch(() => {});
    await page
      .waitForSelector(SIZE_BTN_SEL, { timeout: 12000 })
      .catch(() => {});

    let out = await parse();

    // retry after scroll a bit more if still empty
    if (!out.hasSizes) {
      await page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight * 0.6),
      );
      await page.waitForTimeout(500);
      out = await parse();
    }

    return out;
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

const extractPriceFromDom = async (page) => {
  const out = { price: null, currency: "GBP" };

  try {
    const content = await safeAttr(page, PDP_PRICE_SEL, "content");
    const dataOi = await safeAttr(page, PDP_PRICE_SEL, "data-oi-price");
    const txt = await safeText(page, PDP_PRICE_SEL);

    out.price = toNumber(content) ?? toNumber(dataOi) ?? toNumber(txt) ?? null;
  } catch {}

  return out;
};

const runJdSportsCrawl = async ({
  startUrls = [],
  maxListPages = 1,
  maxProducts = 0, // 0 = no cap
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
          .map((l) => canonicalizeJdUrl(l))
          .filter(Boolean);

        if (Number(maxProducts || 0) > 0) {
          canonicalLinks = canonicalLinks.slice(0, Number(maxProducts));
        }

        await enqueueLinks({
          urls: canonicalLinks,
          label: "DETAIL",
          userData: request.userData || {},
          transformRequestFunction: (req) => {
            const canon = canonicalizeJdUrl(req.url);
            return { ...req, url: canon, uniqueKey: canon };
          },
        });

        if (debug) {
          console.log("🟦 JD LIST extracted:", {
            extracted: links.length,
            canonical: canonicalLinks.length,
            page: currentPage,
            url: request.url,
          });
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

            if (debug) console.log("➡️ JD LIST next:", nextUrl);
          }
        }

        return;
      }

      try {
        await page
          .waitForSelector(PDP_TITLE_SEL, { timeout: 25000 })
          .catch(async () => {
            await page.waitForSelector(PDP_TITLE_FALLBACK_SEL, {
              timeout: 25000,
            });
          });
      } catch {
        if (debug) console.log("❌ JD DETAIL wait failed:", request.url);
        return;
      }

      const productUrl = canonicalizeJdUrl(page.url());
      const title =
        (await safeText(page, PDP_TITLE_SEL)) ||
        (await safeText(page, PDP_TITLE_FALLBACK_SEL)) ||
        null;

      const p = await extractPriceFromDom(page);

      const images = await extractImagesFromDom(page, productUrl);
      const image = images[0] || null;

      const sizes = await extractSizesFromDom(page);
      const inStock = sizes.hasSizes
        ? sizes.inStock
        : await inferInStockFallback(page);

      const store = "jdsports";
      const storeName = "JD Sports";
      const canonicalKey = makeCanonicalKey({ store, productUrl });

      const doc = {
        canonicalKey,
        store,
        storeName,
        title,
        price: p.price,
        currency: "GBP",
        originalPrice: null,
        discountPercent: null,
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
        console.log("🟩 JD PRODUCT_DOC_REQUIRED", {
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

module.exports = { runJdSportsCrawl };
