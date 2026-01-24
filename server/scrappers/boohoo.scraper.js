// server/scrappers/boohoo.scraper.js
const { PlaywrightCrawler, log } = require("crawlee");

const STORE = "boohooman";
const STORE_NAME = "BoohooMAN";

const toAbsUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http")) return url;
  return `https://www.boohooman.com${url.startsWith("/") ? "" : "/"}${url}`;
};

const stripQuery = (url) => {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
};

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

// Only accept real product codes like CMM21782, BMM54230, etc.
// PREMIERMAN and other landing pages will fail this.
const isValidProductId = (id) =>
  /^[A-Z]{2,4}\d{4,6}$/i.test(String(id || "").trim());

const parseProductDetails = async (page) => {
  const form = page
    .locator("form.js-pdpForm, form.pdpForm, form[data-product-details]")
    .first();
  const count = await form.count();
  if (!count) return null;

  const raw = await form.getAttribute("data-product-details");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readPriceFields = (details) => {
  const sales =
    details?.priceData?.sales ||
    details?.priceData?.sale ||
    details?.priceData?.price ||
    details?.price ||
    details?.salesPrice ||
    null;

  const list =
    details?.priceData?.list ||
    details?.priceData?.standard ||
    details?.listPrice ||
    details?.originalPrice ||
    null;

  const price =
    typeof sales?.value === "number"
      ? sales.value
      : typeof sales === "number"
        ? sales
        : null;

  const currency = sales?.currency || details?.currency || null;

  const originalPrice =
    typeof list?.value === "number"
      ? list.value
      : typeof list === "number"
        ? list
        : null;

  const discountPercent =
    details?.discount != null
      ? Number(details.discount)
      : originalPrice && price && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : null;

  return { price, currency, originalPrice, discountPercent };
};

const inferColorName = (details) =>
  details?.dimension65 ||
  details?.colour ||
  details?.color ||
  details?.attributes?.colour ||
  details?.attributes?.color ||
  null;

const inferCategory = (details, fallback) =>
  details?.categoryPath || details?.category || fallback || null;

const extractTitle = async (page) => {
  const t1 = await page
    .locator("h1.product-name, h1.js-product-name, h1")
    .first()
    .textContent()
    .catch(() => null);
  return (t1 || "").trim() || null;
};

const extractSizes = async (page) => {
  const texts = await page.$$eval(
    ".product-options .variation-value, .variation-value, .swatchanchor-text, [data-variation-value]",
    (els) => els.map((e) => (e.textContent || "").trim()).filter(Boolean),
  );
  return uniq(texts).filter((t) => t.length > 0 && t.length <= 10);
};

const extractOgImage = async (page) => {
  const og = await page
    .locator("meta[property='og:image']")
    .first()
    .getAttribute("content")
    .catch(() => null);
  return og ? toAbsUrl(og) : null;
};

/**
 * Reject junk mediahub assets:
 * - dbz_prod_*
 * - GIFT_CARD_ICON
 * - tiny swatches (w=28&h=28) / *_s.jpg
 */
const isJunkMediahub = (url) => {
  const u = String(url || "");
  if (!u.includes("mediahub.boohooman.com")) return true;
  if (/\/dbz_prod_/i.test(u)) return true;
  if (/GIFT_CARD_ICON/i.test(u)) return true;
  if (/_s\.jpg/i.test(u)) return true; // swatch images
  if (/(\?|&)w=28(&|$)/i.test(u) && /(\?|&)h=28(&|$)/i.test(u)) return true;
  return false;
};

/**
 * Normalize mediahub URLs to high quality:
 * - keep the same base asset
 * - force format + width
 */
const toHighQualityMediahub = (rawUrl) => {
  const abs = toAbsUrl(rawUrl);
  if (!abs) return null;
  if (isJunkMediahub(abs)) return null;

  // If it's a template URL like ...?pdp.template -> keep it (already a good hero)
  if (/\?pdp\.template$/i.test(abs)) return abs;

  // Otherwise, rewrite query params to a consistent high-quality version
  try {
    const u = new URL(abs);
    u.searchParams.set("qlt", "85");
    u.searchParams.set("w", "1000");
    u.searchParams.set("h", "1500");
    u.searchParams.set("fit", "ctn");
    u.searchParams.set("fmt", "jpeg");
    // Optional: keep background/crop if already present; don't force crop
    if (!u.searchParams.has("bgc")) u.searchParams.set("bgc", "FFFFFF");
    return u.toString();
  } catch {
    return abs;
  }
};

/**
 * Extract product images (not every <img> on the page).
 * Strategy:
 * - collect all mediahub links from img/src/data-src/data-zoom-image
 * - collect style background urls containing mediahub
 * - normalize to high quality + filter junk
 */
const extractProductMediahubImages = async (page) => {
  const imgCandidates = await page.$$eval("img", (imgs) =>
    imgs
      .map(
        (img) =>
          img.getAttribute("data-zoom-image") ||
          img.getAttribute("data-src") ||
          img.getAttribute("src"),
      )
      .filter(Boolean),
  );

  const bgCandidates = await page.$$eval(
    "[style*='mediahub.boohooman.com']",
    (nodes) =>
      nodes
        .map((n) => n.getAttribute("style") || "")
        .map((s) => {
          const m = s.match(/url\((['"]?)(.*?)\1\)/i);
          return m ? m[2] : null;
        })
        .filter(Boolean),
  );

  const all = uniq(
    [...imgCandidates, ...bgCandidates].map(toAbsUrl).filter(Boolean),
  );

  // Keep only likely product image patterns:
  // - /<productId>_<color>_xl
  // - /<productId>_<color>_xl_1 etc
  // - /<productId>_<color>_xl/<slug>?...
  const filtered = all.filter((u) => !isJunkMediahub(u));

  return uniq(filtered.map(toHighQualityMediahub).filter(Boolean));
};

const extractSwatchUrls = async (page) => {
  const hrefs = await page.$$eval(
    "a.swatchanchor, a.js-swatchanchor, a[data-color], a[title*='Colour'], a[title*='Color']",
    (as) => as.map((a) => a.getAttribute("href")).filter(Boolean),
  );

  const colorLinks = hrefs.filter((h) => /(\?|&)color=\d+/i.test(h));
  return uniq(colorLinks.map(toAbsUrl));
};

const runBoohooCrawl = async ({
  startUrls = [],
  maxListPages = 1,
  debug = false,
} = {}) => {
  if (!startUrls.length) throw new Error("runBoohooCrawl requires startUrls");

  const productsMap = new Map(); // productId -> aggregated doc (Option A)
  const seenColorUrls = new Set();
  const seenListPages = new Set();

  const crawler = new PlaywrightCrawler({
    maxConcurrency: 3,
    requestHandlerTimeoutSecs: 60,
    navigationTimeoutSecs: 60,
    async requestHandler({ request, page }) {
      const label = request.userData?.label || "LIST";

      if (debug) log.info(`[${label}] ${request.url}`);

      if (label === "LIST") {
        const hrefs = await page.$$eval(
          "a.thumb-link.js-canonical-link, a.js-canonical-link, a.thumb-link",
          (as) =>
            as
              .map((a) => a.getAttribute("href") || a.getAttribute("data-href"))
              .filter(Boolean),
        );

        const productUrls = uniq(hrefs.map(toAbsUrl)).filter(Boolean);

        for (const url of productUrls) {
          await crawler.addRequests([
            {
              url,
              userData: {
                label: "PDP",
                gender: request.userData?.gender || null,
                category: request.userData?.category || null,
              },
            },
          ]);
        }

        seenListPages.add(request.url);
        if (seenListPages.size >= maxListPages) return;

        const nextHref =
          (await page
            .locator("li.pagination-item-next a")
            .first()
            .getAttribute("href")
            .catch(() => null)) ||
          (await page
            .locator("a[title*='Next']")
            .first()
            .getAttribute("href")
            .catch(() => null));

        const nextUrl = nextHref ? toAbsUrl(nextHref) : null;

        if (nextUrl && !seenListPages.has(nextUrl)) {
          await crawler.addRequests([
            {
              url: nextUrl,
              userData: {
                label: "LIST",
                gender: request.userData?.gender || null,
                category: request.userData?.category || null,
              },
            },
          ]);
        }

        return;
      }

      // PDP
      const details = await parseProductDetails(page);

      const productId =
        details?.id || details?.productId || details?.masterId || null;
      const title =
        (details?.name || (await extractTitle(page)) || "").trim() || null;

      // ✅ Skip non-product pages like PREMIERMAN
      if (!productId || !isValidProductId(productId)) {
        if (debug)
          log.warning(
            `Skipping non-product PDP: id=${productId} url=${request.url}`,
          );
        return;
      }

      const canonicalKey = `${STORE}:${productId}`;
      const productUrl = stripQuery(request.url);

      const { price, currency, originalPrice, discountPercent } =
        readPriceFields(details);

      const ogImageRaw = await extractOgImage(page);
      const ogImage = toHighQualityMediahub(ogImageRaw);

      const galleryImages = await extractProductMediahubImages(page);

      // ensure main image is included and high quality
      const images = uniq([ogImage, ...galleryImages].filter(Boolean));
      const mainImage = ogImage || images[0] || null;

      const color = inferColorName(details);
      const sizes = await extractSizes(page);

      const gender = request.userData?.gender || "men";
      const category = inferCategory(
        details,
        request.userData?.category || null,
      );

      const inStock =
        details?.isInStock != null ? Boolean(details.isInStock) : true;

      const existing = productsMap.get(productId);

      const merged = existing || {
        canonicalKey,
        store: STORE,
        storeName: STORE_NAME,
        title,
        price,
        currency,
        originalPrice: originalPrice || null,
        discountPercent: discountPercent != null ? discountPercent : null,
        image: mainImage,
        images: [],
        productUrl,
        saleUrl: null,
        category,
        gender,
        colors: [],
        sizesRaw: [],
        sizes: [],
        inStock,
        status: "active",
      };

      // Merge
      merged.title = merged.title || title;
      merged.price = price != null ? price : merged.price;
      merged.currency = currency || merged.currency;
      merged.originalPrice =
        originalPrice != null ? originalPrice : merged.originalPrice;
      merged.discountPercent =
        discountPercent != null ? discountPercent : merged.discountPercent;
      merged.productUrl = merged.productUrl || productUrl;
      merged.category = merged.category || category;
      merged.gender = merged.gender || gender;

      // ✅ All colors: accumulate high-quality images only
      merged.images = uniq([...(merged.images || []), ...images]);
      merged.image = merged.image || mainImage || merged.images[0] || null;

      if (color)
        merged.colors = uniq([
          ...(merged.colors || []),
          String(color).trim().toLowerCase(),
        ]);

      merged.sizesRaw = uniq([...(merged.sizesRaw || []), ...sizes]);
      merged.sizes = uniq([...(merged.sizes || []), ...sizes]);

      merged.inStock = Boolean(merged.inStock || inStock);

      productsMap.set(productId, merged);

      // ✅ DEBUG: print required fields + images (clean)
      if (debug) {
        const preview = {
          canonicalKey: merged.canonicalKey,
          store: merged.store,
          storeName: merged.storeName,
          title: merged.title,
          price: merged.price,
          currency: merged.currency,
          originalPrice: merged.originalPrice,
          discountPercent: merged.discountPercent,
          image: merged.image,
          images: merged.images,
          productUrl: merged.productUrl,
          saleUrl: merged.saleUrl,
          category: merged.category,
          gender: merged.gender,
          colors: merged.colors,
          sizesRaw: merged.sizesRaw,
          sizes: merged.sizes,
          inStock: merged.inStock,
          status: merged.status,
        };

        console.log("✅ BOOHOO_PRODUCT:", JSON.stringify(preview, null, 2));
      }

      // Enqueue other colors (All colors)
      const swatchUrls = await extractSwatchUrls(page);
      for (const u of swatchUrls) {
        if (seenColorUrls.has(u)) continue;
        if (!u.includes(`/${productId}.html`)) continue;

        seenColorUrls.add(u);
        await crawler.addRequests([
          {
            url: u,
            userData: {
              label: "PDP",
              gender,
              category,
            },
          },
        ]);
      }
    },
  });

  const initialRequests = startUrls.map((s) => ({
    url: s.url,
    userData: { label: "LIST", ...(s.userData || {}) },
  }));

  await crawler.run(initialRequests);

  return Array.from(productsMap.values());
};

module.exports = { runBoohooCrawl };
