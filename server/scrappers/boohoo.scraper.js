// server/scrappers/boohoo.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const crypto = require("crypto");

const DEFAULT_START_URLS = [
  {
    url: "https://www.boohooman.com/mens/hoodies-sweatshirts",
    userData: { gender: "men", category: "hoodies-sweatshirts" },
  },
];

const LIST_READY_SEL =
  ".search-result-items, .search-result-items .grid-tile, .grid-tile";
const LIST_TILES_SEL = ".search-result-items .grid-tile, .grid-tile";
const LIST_LINKS_SEL = "a.thumb-link.js-canonical-link[href]";

const PAGINATION_PAGE_LINKS_SEL = ".pagination a, .pagination-bar a, .paging a";

const PDP_TITLE_SEL = "h1.product-name.js-product-name, h1.product-name, h1";

// price
const PDP_META_CURRENCY_SEL = 'meta[itemprop="priceCurrency"]';
const PDP_META_PRICE_SEL =
  'span[itemprop="price"][content], meta[itemprop="price"]';
const PDP_PRICE_SALES_SEL = "span.price-sales, span.price-sales-red";
const PDP_PRICE_WAS_SEL = "span.price-standard, span.price-was";

// product json embedded in attributes
const PDP_PDPMAIN_SEL = "#pdpMain";
const PDP_FORM_SEL = 'form[id^="dwfrm_product_addtocart"]';

// sizes
const PDP_SIZE_SWATCH_LI_SEL =
  "ul.swatches.size li.variation-value.selectable, ul.swatches.size li.variation-value";

// colors
const PDP_COLOR_LABEL_SEL =
  ".product-variations, .product-options, #pdpMain, body";
const PDP_COLOR_SWATCH_SEL =
  "ul.swatches.color li.variation-value, ul.swatches.colour li.variation-value, ul.swatches.Color li.variation-value, ul.swatches.Colour li.variation-value, ul.swatches.color li, ul.swatches.colour li";

// ✅ images (ONLY mediahub)
const PDP_IMG_SEL =
  'img[srcset*="mediahub.boohooman.com"], img[src*="mediahub.boohooman.com"]';

const toNumber = (val) => {
  if (val == null) return null;
  if (typeof val === "number") return val;
  const n = Number(String(val).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const parseCurrency = (str) => {
  const s = String(str || "");
  if (s.includes("£")) return "GBP";
  if (s.includes("$")) return "USD";
  if (s.includes("€")) return "EUR";
  return "GBP";
};

const hash = (s) => crypto.createHash("sha1").update(String(s)).digest("hex");

const safeText = async (page, sel) => {
  try {
    const el = await page.$(sel);
    if (!el) return null;
    const t = await el.textContent();
    return (t || "").trim() || null;
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

// ✅ A) w=1500 balanced
const normalizeMediahubImageUrl = (url) => {
  if (!url) return null;
  let u = String(url).trim().split(" ")[0];

  if (u.startsWith("//")) u = `https:${u}`;

  try {
    const parsed = new URL(u);

    // wipe sizing/quality params (we enforce our own)
    const kill = new Set([
      "w",
      "h",
      "sw",
      "sh",
      "sm",
      "qlt",
      "fmt",
      "fit",
      "bg",
      "upscale",
      "crop",
      "align",
    ]);
    for (const k of [...parsed.searchParams.keys()]) {
      if (kill.has(k)) parsed.searchParams.delete(k);
      if (k.includes("$") || k.toLowerCase().includes("n_"))
        parsed.searchParams.delete(k);
    }

    // enforce balanced HQ
    parsed.searchParams.set("w", "1500");
    parsed.searchParams.set("qlt", "95");
    parsed.searchParams.set("fit", "ctn");
    parsed.searchParams.set("fmt", "webp");

    return parsed.toString();
  } catch {
    return u;
  }
};

const extractDiscountPercent = ({ salesText, wasText }) => {
  const s = String(salesText || "");
  const m = s.match(/\((-?\d+)%\)/);
  if (m) return toNumber(m[1]);

  const now = toNumber(salesText);
  const was = toNumber(wasText);

  if (now != null && was != null && was > 0 && now > 0 && was >= now) {
    const pct = Math.round(((was - now) / was) * 100);
    return Number.isFinite(pct) ? pct : null;
  }

  return null;
};

const tryAcceptCookies = async (page) => {
  const candidates = [
    'button:has-text("Accept all")',
    'button:has-text("Accept All")',
    'button:has-text("Accept")',
    'button:has-text("I Accept")',
    'button:has-text("Agree")',
    'button[id*="accept"]',
    'button[class*="accept"]',
    'button[aria-label*="accept" i]',
  ];

  for (const sel of candidates) {
    try {
      const btn = page.locator(sel).first();
      if ((await btn.count()) > 0) {
        await btn.click({ timeout: 1500 }).catch(() => null);
        return;
      }
    } catch {
      // ignore
    }
  }
};

const waitForListGrid = async (page) => {
  await page.waitForSelector(LIST_READY_SEL, { timeout: 25000 });
  await page
    .waitForFunction(
      (sel) => document.querySelectorAll(sel).length >= 6,
      LIST_TILES_SEL,
      { timeout: 25000 },
    )
    .catch(() => null);
};

const collectPdpLinks = async (page) => {
  await waitForListGrid(page);

  const links = await page.$$eval(LIST_LINKS_SEL, (as) => {
    const hrefs = as.map((a) => a.getAttribute("href") || "").filter(Boolean);

    const abs = hrefs.map((h) => {
      if (h.startsWith("http")) return h;
      if (h.startsWith("//")) return `https:${h}`;
      if (h.startsWith("/")) return `${location.origin}${h}`;
      return `${location.origin}/${h}`;
    });

    return abs
      .filter((u) => /\.html(\?|#|$)/i.test(u))
      .map((u) => u.split("#")[0]);
  });

  return Array.from(new Set((links || []).filter(Boolean)));
};

const extractPaginationHrefs = async (page) => {
  try {
    const hrefs = await page.$$eval(PAGINATION_PAGE_LINKS_SEL, (as) => {
      const links = as
        .map((a) => (a.getAttribute("href") || "").trim())
        .filter(Boolean);

      const abs = links.map((h) => {
        if (h.startsWith("http")) return h;
        if (h.startsWith("//")) return `https:${h}`;
        if (h.startsWith("/")) return `${location.origin}${h}`;
        return `${location.origin}/${h}`;
      });

      return abs;
    });

    const filtered = (hrefs || []).filter((u) =>
      /[?&](start|sz|page)=/i.test(u),
    );

    return Array.from(new Set(filtered));
  } catch {
    return [];
  }
};

const extractProductId = async (page) => {
  try {
    const raw = await page.$eval(PDP_PDPMAIN_SEL, (el) =>
      el.getAttribute("data-product-details-amplience"),
    );
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        const id = obj?.id || obj?.masterId || obj?.productId || null;
        if (id) return String(id);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  try {
    const raw = await page.$eval(PDP_FORM_SEL, (el) =>
      el.getAttribute("data-product-details"),
    );
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        const id = obj?.id || obj?.productId || obj?.masterId || null;
        if (id) return String(id);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  try {
    const u = page.url();
    const m = u.match(/\/([A-Z]{1,4}\d{4,10})\.html/i);
    if (m && m[1]) return String(m[1]).toUpperCase();
  } catch {
    // ignore
  }

  return null;
};

// ✅ UPDATED: dedupe by path (strip query), then enforce HQ params
const extractImages = async (page) => {
  try {
    const urls = await page.$$eval(PDP_IMG_SEL, (imgs) => {
      const out = [];

      const pickBest = (srcset) => {
        const parts = String(srcset || "")
          .split(",")
          .map((p) => p.trim().split(" ")[0])
          .filter(Boolean);
        return parts.length ? parts[parts.length - 1] : null;
      };

      for (const img of imgs) {
        const srcset = (img.getAttribute("srcset") || "").trim();
        const src = (img.getAttribute("src") || "").trim();

        const chosen = pickBest(srcset) || src;
        if (!chosen) continue;

        let u = chosen.split(" ")[0].trim();
        if (u.startsWith("//")) u = `https:${u}`;
        out.push(u);
      }

      return out;
    });

    const pathUniq = Array.from(
      new Set(
        (urls || [])
          .filter(Boolean)
          .filter((u) => /mediahub\.boohooman\.com/i.test(u))
          .map((u) => u.split("#")[0])
          .map((u) => u.split("?")[0]),
      ),
    );

    const final = pathUniq
      .map((u) => normalizeMediahubImageUrl(u))
      .filter(Boolean);

    return { image: final[0] || null, images: final };
  } catch {
    return { image: null, images: [] };
  }
};

const extractColor = async (page) => {
  try {
    const txt = await page.$eval(PDP_COLOR_LABEL_SEL, () => {
      const clean = (t) =>
        String(t || "")
          .replace(/\s+/g, " ")
          .trim();
      const body = clean(document.body?.innerText || "");
      const m = body.match(
        /(?:^|\s)(COLOUR|COLOR)\s*:\s*([A-Za-z0-9][A-Za-z0-9\s'/-]{1,40})/i,
      );
      return m ? clean(m[2]) : null;
    });

    if (txt) return { colorsRaw: [txt], colors: [txt] };
  } catch {
    // ignore
  }

  try {
    const colors = await page.$$eval(PDP_COLOR_SWATCH_SEL, (lis) => {
      const clean = (t) =>
        String(t || "")
          .replace(/\s+/g, " ")
          .trim();
      const out = new Set();

      for (const li of lis) {
        const raw = li.getAttribute("data-variation-values");
        if (!raw) continue;

        try {
          const obj = JSON.parse(raw);
          const c = obj?.color || obj?.colour || obj?.value || null;
          if (c) out.add(clean(c));
        } catch {
          // ignore
        }
      }

      return Array.from(out).filter(Boolean);
    });

    const uniq = Array.from(
      new Set((colors || []).map((x) => String(x).trim()).filter(Boolean)),
    );

    return { colorsRaw: uniq, colors: uniq };
  } catch {
    return { colorsRaw: [], colors: [] };
  }
};

const extractSizes = async (page) => {
  try {
    await page
      .waitForSelector(PDP_SIZE_SWATCH_LI_SEL, { timeout: 15000 })
      .catch(() => null);

    const sizesRaw = await page.$$eval(PDP_SIZE_SWATCH_LI_SEL, (lis) => {
      const clean = (t) =>
        String(t || "")
          .replace(/\s+/g, " ")
          .trim();

      const looksLikeSize = (s) => {
        const t = clean(s);
        if (!t) return false;
        if (t.length > 24) return false;
        return (
          /^(xxs|2xs|xs|s|m|l|xl|xxl|2xl|xxxl)$/i.test(t) ||
          /^\d{1,3}$/.test(t) ||
          /^(uk|us|eu)\s?\d{1,3}$/i.test(t)
        );
      };

      const out = [];
      for (const li of lis) {
        const cls = (li.getAttribute("class") || "").toLowerCase();
        if (cls.includes("unselectable") || cls.includes("disabled")) continue;

        const anchor =
          li.querySelector("span.swatchanchor") || li.querySelector("a") || li;

        const t = clean(anchor.textContent);
        if (t && looksLikeSize(t)) out.push(t);
      }

      return out;
    });

    const uniq = Array.from(new Set((sizesRaw || []).filter(Boolean)));
    return { sizesRaw: uniq, sizes: uniq };
  } catch {
    return { sizesRaw: [], sizes: [] };
  }
};

const extractPrices = async ({ page }) => {
  const metaCurrency = await safeAttr(page, PDP_META_CURRENCY_SEL, "content");

  const itempropPrice = await safeAttr(page, PDP_META_PRICE_SEL, "content");
  const domSalesText = await safeText(page, PDP_PRICE_SALES_SEL);
  const domWasText = await safeText(page, PDP_PRICE_WAS_SEL);

  const price = toNumber(itempropPrice) ?? toNumber(domSalesText) ?? null;
  const originalPrice = toNumber(domWasText) ?? null;

  const currency = metaCurrency || parseCurrency(domSalesText) || "GBP";

  const discountPercent = extractDiscountPercent({
    salesText: domSalesText,
    wasText: domWasText,
  });

  return {
    price,
    originalPrice,
    currency,
    discountPercent,
    domSalesText,
    domWasText,
  };
};

const runBoohooCrawl = async ({
  startUrls = [],
  maxListPages = 1,
  debug = false,
} = {}) => {
  const results = [];

  const crawler = new PlaywrightCrawler({
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 120,

    async requestHandler({ page, request, enqueueLinks }) {
      const label = (request.label || "LIST").toUpperCase();

      await page
        .setViewportSize({ width: 1400, height: 900 })
        .catch(() => null);

      if (label === "LIST") {
        const gender = request.userData?.gender || null;
        const category = request.userData?.category || null;
        const baseUrl = request.userData?.baseUrl || request.url;

        await page.goto(request.url, { waitUntil: "domcontentloaded" });
        await tryAcceptCookies(page);

        const pageUrls = await extractPaginationHrefs(page);

        const targetListUrls = pageUrls.length
          ? [request.url, ...pageUrls].slice(0, maxListPages)
          : [request.url];

        if (pageUrls.length) {
          if (debug)
            console.log("📄 LIST enqueued href-pages:", targetListUrls.length);

          await enqueueLinks({
            urls: Array.from(new Set(targetListUrls)),
            label: "LIST_PAGE",
            userData: { gender, category, baseUrl },
          });
          return;
        }

        await enqueueLinks({
          urls: [request.url],
          label: "LIST_PAGE",
          userData: { gender, category, baseUrl },
        });

        return;
      }

      if (label === "LIST_PAGE") {
        const gender = request.userData?.gender || null;
        const category = request.userData?.category || null;
        const baseUrl = request.userData?.baseUrl || request.url;

        await page.goto(request.url, { waitUntil: "domcontentloaded" });
        await tryAcceptCookies(page);

        const tileCount = await page
          .locator(LIST_TILES_SEL)
          .count()
          .catch(() => 0);
        const pdpLinks = await collectPdpLinks(page);

        if (debug) {
          console.log("📄 LIST_PAGE", request.url);
          console.log(
            "📄 LIST_PAGE tileCount",
            tileCount,
            "links",
            pdpLinks.length,
          );
        }

        if (!pdpLinks.length) return;

        await enqueueLinks({
          urls: pdpLinks,
          label: "DETAIL",
          userData: { gender, category, baseUrl },
        });

        return;
      }

      if (label === "DETAIL") {
        if (debug) console.log("🔎 DETAIL:", request.url);

        await tryAcceptCookies(page);

        try {
          await page.waitForSelector(PDP_TITLE_SEL, { timeout: 30000 });
        } catch {
          if (debug) {
            const htmlTitle = await page.title().catch(() => null);
            console.log(
              "❌ DETAIL title not found:",
              request.url,
              "PAGE_TITLE:",
              htmlTitle,
            );
          }
          return;
        }

        const title =
          (await page
            .$eval(PDP_TITLE_SEL, (el) => el.textContent?.trim() || "")
            .catch(() => "")) || null;

        const productUrl = request.url;
        const productId = await extractProductId(page);

        const { price, originalPrice, currency, discountPercent } =
          await extractPrices({ page });

        const { image, images } = await extractImages(page);

        const { colors } = await extractColor(page);
        const { sizesRaw, sizes } = await extractSizes(page);

        const inStock = Array.isArray(sizes) ? sizes.length > 0 : true;

        const store = "boohoo";
        const storeName = "BoohooMAN";
        const canonicalKey = hash(`${store}:${productId || productUrl}`);

        const gender = request.userData?.gender || null;
        const category = request.userData?.category || null;
        const saleUrl = request.userData?.baseUrl || null;

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
          saleUrl,
          category,
          gender,
          colors,
          sizesRaw,
          sizes,
          inStock,
          status: "active",
          lastSeenAt: new Date(),
        };

        if (
          !doc.canonicalKey ||
          !doc.store ||
          !doc.storeName ||
          !doc.title ||
          doc.price == null ||
          !doc.currency ||
          !doc.image ||
          !doc.productUrl
        ) {
          if (debug) {
            console.log("⚠️ DETAIL skip missing required:", {
              url: productUrl,
              title: doc.title,
              price: doc.price,
              currency: doc.currency,
              image: doc.image,
              imagesLen: doc.images?.length || 0,
              productId,
            });
          }
          return;
        }

        if (debug) {
          console.log("🟩 PRODUCT_DOC_REQUIRED", {
            canonicalKey: doc.canonicalKey,
            store: doc.store,
            storeName: doc.storeName,
            title: doc.title,
            price: doc.price,
            currency: doc.currency,
            image: doc.image,
            imagesCount: Array.isArray(doc.images) ? doc.images.length : 0, // ✅ count
            productUrl: doc.productUrl,
          });

          // ✅ optional sample (first 3)
          const sample = (doc.images || []).slice(0, 3);
          console.log("🖼️ IMAGES_SAMPLE", sample);
        }

        results.push(doc);
        return;
      }
    },
  });

  const finalStartUrls = (startUrls || []).length
    ? startUrls
    : DEFAULT_START_URLS;

  const seeds = (finalStartUrls || []).filter(Boolean).map((u) => {
    const url = typeof u === "string" ? u : u.url;
    const userData = typeof u === "string" ? {} : u.userData || {};
    return {
      url,
      label: "LIST",
      userData: { ...userData, baseUrl: url, page: 1 },
    };
  });

  if (debug) console.log("🌱 SEEDS", seeds);

  await crawler.run(seeds);

  const map = new Map();
  for (const p of results) map.set(p.canonicalKey, p);

  return Array.from(map.values());
};

module.exports = { runBoohooCrawl };
