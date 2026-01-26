const { PlaywrightCrawler } = require("crawlee");
const crypto = require("crypto");

const DEFAULT_START_URLS = [
  {
    url: "https://www.nike.com/gb/w/mens-sale-3yaepz6ymx6",
    userData: { gender: "men", category: "sale" },
  },
  {
    url: "https://www.nike.com/gb/w/womens-sale-3yaepz5e1x6",
    userData: { gender: "women", category: "sale" },
  },
];

const LIST_CARD_SEL = 'div[data-testid="product-card"]';
const LIST_LINK_SEL = 'a[data-testid="product-card__link-overlay"][href]';

const PDP_TITLE_SEL = 'h1#pdp_product_title[data-testid="product_title"]';
const PDP_SUBTITLE_SEL =
  'h2#pdp_product_subtitle[data-testid="product_subtitle"]';

const PDP_HERO_IMG_SEL = 'img[data-testid="HeroImg"][src]';
const PDP_THUMB_IMGS_SEL =
  '[data-testid="ThumbnailListContainer"] img[src], [data-testid*="thumbnail" i] img[src]';

const PDP_PRICE_CONTAINER_SEL = "#price-container";
const PDP_CURRENT_PRICE_SEL = 'span[data-testid="currentPrice-container"]';

const PDP_SIZE_WRAP_SEL = 'div#size-selector[data-testid="size-selector"]';
const PDP_SIZE_BTN_SEL =
  'div#size-selector button, [data-testid="size-selector"] button';

const hash = (s) => crypto.createHash("sha1").update(String(s)).digest("hex");

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

const normalizeNikeImg = (url) => {
  if (!url) return null;
  let u = String(url).trim().split(" ")[0];
  if (u.startsWith("//")) u = `https:${u}`;
  return u;
};

const extractStyleCodeFromUrl = (url) => {
  const u = String(url || "");
  const m =
    u.match(/\/([A-Z0-9]{2,8}\d{3,8}-\d{2,4})(?:\?|#|$)/) ||
    u.match(/\/([A-Z]{1,6}\d{3,10})(?:\?|#|$)/);
  return m && m[1] ? String(m[1]).toUpperCase() : null;
};

const isCustomNikeUrl = (url = "") => String(url).includes("/u/custom-");

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

const autoScroll = async (page, maxScrolls = 6) => {
  for (let i = 0; i < maxScrolls; i += 1) {
    const prevCount = await page
      .locator(LIST_CARD_SEL)
      .count()
      .catch(() => 0);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);

    const nextCount = await page
      .locator(LIST_CARD_SEL)
      .count()
      .catch(() => 0);
    if (nextCount <= prevCount) break;
  }

  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => null);
};

const collectPdpLinks = async (page) => {
  await page.waitForSelector(LIST_CARD_SEL, { timeout: 25000 });

  const hrefs = await page.$$eval(LIST_LINK_SEL, (as) => {
    const abs = (h) => {
      if (!h) return null;
      if (h.startsWith("http")) return h;
      if (h.startsWith("//")) return `https:${h}`;
      if (h.startsWith("/")) return `${location.origin}${h}`;
      return `${location.origin}/${h}`;
    };

    return as
      .map((a) => a.getAttribute("href") || "")
      .map((h) => abs(h))
      .filter(Boolean)
      .map((u) => u.split("#")[0]);
  });

  return Array.from(new Set((hrefs || []).filter(Boolean)));
};

const extractImages = async (page) => {
  const hero = await safeAttr(page, PDP_HERO_IMG_SEL, "src");
  const thumbs = await page
    .$$eval(PDP_THUMB_IMGS_SEL, (imgs) =>
      imgs
        .map((img) => img.getAttribute("src") || "")
        .filter(Boolean)
        .map((u) => u.split(" ")[0]),
    )
    .catch(() => []);

  const all = [hero, ...(thumbs || [])].map(normalizeNikeImg).filter(Boolean);

  const uniq = Array.from(new Set(all));
  return { image: uniq[0] || null, images: uniq };
};

const extractPrices = async (page) => {
  const currentText = await safeText(page, PDP_CURRENT_PRICE_SEL);

  const containerText = await page
    .$eval(PDP_PRICE_CONTAINER_SEL, (el) =>
      (el.textContent || "").replace(/\s+/g, " ").trim(),
    )
    .catch(() => "");

  const currency = parseCurrency(currentText || containerText);

  const current = toNumber(currentText);
  let original = null;

  if (containerText) {
    const matches = containerText.match(/[£$€]\s*\d+(?:\.\d+)?/g) || [];
    const nums = matches.map((m) => toNumber(m)).filter((n) => n != null);

    if (nums.length >= 2) {
      const cur = current != null ? current : nums[0];
      const other = nums.find((n) => n !== cur);
      original = other != null ? other : null;
    }
  }

  const price = current != null ? current : toNumber(containerText);

  const discountPercent =
    original && price && original > price
      ? Math.round(((original - price) / original) * 100)
      : null;

  return {
    price: price != null ? price : null,
    originalPrice: original != null ? original : null,
    currency: currency || "GBP",
    discountPercent,
  };
};

const extractSizes = async (page) => {
  try {
    await page
      .waitForSelector(PDP_SIZE_WRAP_SEL, { timeout: 12000 })
      .catch(() => null);

    const sizesRaw = await page
      .$$eval(PDP_SIZE_BTN_SEL, (btns) => {
        const clean = (t) =>
          String(t || "")
            .replace(/\s+/g, " ")
            .trim();

        const isDisabled = (b) => {
          const aria = (b.getAttribute("aria-disabled") || "").toLowerCase();
          if (aria === "true") return true;
          if (b.disabled) return true;
          const cls = (b.getAttribute("class") || "").toLowerCase();
          if (cls.includes("disabled")) return true;
          return false;
        };

        return btns
          .filter((b) => !isDisabled(b))
          .map((b) => clean(b.textContent))
          .filter(Boolean);
      })
      .catch(() => []);

    const uniq = Array.from(new Set((sizesRaw || []).filter(Boolean)));
    return { sizesRaw: uniq, sizes: uniq };
  } catch {
    return { sizesRaw: [], sizes: [] };
  }
};

const blockHeavy = async (page) => {
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "image" || rt === "font" || rt === "media") return route.abort();
    return route.continue();
  });
};

const runNikeCrawl = async ({
  startUrls = [],
  maxListPages = 1,
  debug = false,
} = {}) => {
  const results = [];

  const crawler = new PlaywrightCrawler({
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 180,
    navigationTimeoutSecs: 120,
    maxRequestRetries: 2,

    preNavigationHooks: [
      async ({ page }) => {
        await blockHeavy(page).catch(() => null);
      },
    ],

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

        const scrollBatches = Math.max(1, Number(maxListPages || 1));
        await autoScroll(page, scrollBatches * 4);

        const links = await collectPdpLinks(page);
        const filtered = links.filter((u) => !isCustomNikeUrl(u));

        if (!filtered.length) {
          if (debug) console.log("⚠️ NIKE LIST no links:", request.url);
          return;
        }

        if (debug)
          console.log("📄 NIKE LIST links:", filtered.length, request.url);

        await enqueueLinks({
          urls: filtered,
          label: "DETAIL",
          userData: { gender, category, baseUrl },
        });

        return;
      }

      // DETAIL
      if (isCustomNikeUrl(request.url)) {
        if (debug) console.log("⏭️ NIKE SKIP custom page:", request.url);
        return;
      }

      await page.goto(request.url, { waitUntil: "domcontentloaded" });

      try {
        await page.waitForSelector(PDP_TITLE_SEL, { timeout: 45000 });
      } catch {
        if (debug) console.log("❌ NIKE DETAIL title not found:", request.url);
        return;
      }

      const productUrl = request.url;

      const title = (await safeText(page, PDP_TITLE_SEL)) || null;
      const subtitle = (await safeText(page, PDP_SUBTITLE_SEL)) || null;

      const { price, originalPrice, currency, discountPercent } =
        await extractPrices(page);

      const { image, images } = await extractImages(page);
      const { sizesRaw, sizes } = await extractSizes(page);

      const inStock = Array.isArray(sizes) ? sizes.length > 0 : true;

      const store = "nike";
      const storeName = "Nike";

      const styleCode = extractStyleCodeFromUrl(productUrl);
      const canonicalKey = hash(`${store}:${styleCode || productUrl}`);

      const gender = request.userData?.gender || null;
      const category = request.userData?.category || null;
      const saleUrl = request.userData?.baseUrl || null;

      const doc = {
        canonicalKey,
        store,
        storeName,
        title: subtitle ? `${title} — ${subtitle}` : title,
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
        colors: [],
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
          console.log("⚠️ NIKE SKIP missing required:", {
            url: productUrl,
            title: doc.title,
            price: doc.price,
            currency: doc.currency,
            image: doc.image,
            imagesLen: doc.images?.length || 0,
          });
        }
        return;
      }

      if (debug) {
        console.log("🟩 NIKE PRODUCT_DOC_REQUIRED", {
          canonicalKey: doc.canonicalKey,
          store: doc.store,
          storeName: doc.storeName,
          title: doc.title,
          price: doc.price,
          currency: doc.currency,
          image: doc.image,
          imagesCount: Array.isArray(doc.images) ? doc.images.length : 0,
          productUrl: doc.productUrl,
        });
      }

      results.push(doc);
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
      userData: { ...userData, baseUrl: url },
    };
  });

  if (debug) console.log("🌱 NIKE SEEDS", seeds);

  await crawler.run(seeds);

  const map = new Map();
  for (const p of results) map.set(p.canonicalKey, p);

  return Array.from(map.values());
};

module.exports = { runNikeCrawl };
