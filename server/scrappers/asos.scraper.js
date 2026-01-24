// server/scrappers/asos.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const crypto = require("crypto");

const DEFAULT_START_URLS = [
  {
    url: "https://www.asos.com/women/sale/cat/?cid=7046",
    userData: { gender: "women", category: "sale" },
  },
  {
    url: "https://www.asos.com/men/sale/cat/?cid=8409",
    userData: { gender: "men", category: "sale" },
  },
];

const LIST_READY_SEL = '[data-auto-id="1"][data-testid="listing-results-1"]';
const LIST_TILES_SEL = 'li[id^="product-"], li.productTile_U0clN';
const LIST_LINKS_SEL = 'a[href*="/prd/"]';

const PDP_TITLE_SEL = "h1";
const PDP_PRICE_SR_SEL = '[data-testid="price-screenreader-only-text"]';

// DOM hero fallback
const PDP_HERO_IMG_SEL =
  ".amp-page.amp-images .fullImageContainer img[src], .amp-page.amp-images img[src], .amp-spinner .fullImageContainer img[src]";

// DOM price fallbacks
const PDP_PRICE_CURRENT_SEL =
  '[data-testid="current-price"], [data-testid="product-price"], [data-testid="price-current"]';
const PDP_PRICE_WAS_SEL =
  '[data-testid="previous-price"], [data-testid="price-previous"], [data-testid="product-price-previous"]';
const PDP_META_PRICE_SEL =
  'meta[itemprop="price"], meta[property="product:price:amount"]';
const PDP_META_CURRENCY_SEL =
  'meta[itemprop="priceCurrency"], meta[property="product:price:currency"]';

// JSON-LD fallback
const PDP_JSONLD_SEL = 'script[type="application/ld+json"]';

// ✅ Size selectors
const PDP_SIZE_SELECT_SEL = [
  "select#variantSelector",
  'div[data-testid="variant-selector"] select',
  'select[data-testid*="size"]',
  'select[id*="size"]',
  'select[name*="size"]',
  'select[aria-label*="size" i]',
  '[data-testid*="size"] select',
].join(", ");

const PDP_SIZE_OPTION_SEL = `${PDP_SIZE_SELECT_SEL} option`;

// ✅ Some PDPs render sizes as buttons (fallback)
const PDP_SIZE_BUTTON_SEL = [
  '[data-testid*="size"] button',
  'button[aria-label*="size" i]',
  '[aria-label*="size" i] button',
].join(", ");

// ✅ Color swatches / links (best-effort DOM)
const PDP_COLOR_SWATCH_LINK_SEL = [
  'a[href*="colourWayId"]',
  'a[href*="colorWayId"]',
  'a[href*="#colourWayId"]',
  'a[href*="#colorWayId"]',
].join(", ");

// Grab ASOS PDP JSON
const PDP_JSON_SELECTORS = [
  "window.__APOLLO_STATE__",
  "window.__INITIAL_STATE__",
  "window.__PRELOADED_STATE__",
  "window.__NEXT_DATA__",
];

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

const normalizeAsosImageUrl = (url) => {
  if (!url) return null;
  let u = String(url).trim().split(" ")[0];

  if (u.startsWith("//")) u = `https:${u}`;

  try {
    const parsed = new URL(u);

    for (const k of [...parsed.searchParams.keys()]) {
      if (k.includes("$n_") || k.includes("%24n_"))
        parsed.searchParams.delete(k);
    }

    parsed.searchParams.set("wid", "1200");
    parsed.searchParams.set("fit", "constrain");
    return parsed.toString();
  } catch {
    return u;
  }
};

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

const getAsosPdpJson = async (page) => {
  for (const key of PDP_JSON_SELECTORS) {
    try {
      const data = await page.evaluate((k) => {
        try {
          // eslint-disable-next-line no-eval
          return eval(k);
        } catch {
          return null;
        }
      }, key);
      if (data) return { key, data };
    } catch {
      // ignore
    }
  }

  // fallback: read __NEXT_DATA__ from script tag
  try {
    const nextData = await page.evaluate(() => {
      const el = document.querySelector("script#__NEXT_DATA__");
      if (!el) return null;
      try {
        return JSON.parse(el.textContent || "null");
      } catch {
        return null;
      }
    });
    if (nextData) return { key: "script#__NEXT_DATA__", data: nextData };
  } catch {
    // ignore
  }

  return { key: null, data: null };
};

// ✅ Extract productId (best effort)
const extractProductIdFromJson = (json) => {
  if (!json) return null;

  const q = [json];
  const seen = new Set();
  let nodes = 0;

  while (q.length) {
    const cur = q.shift();
    if (!cur) continue;

    if (typeof cur !== "object") continue;
    if (seen.has(cur)) continue;
    seen.add(cur);

    nodes += 1;
    if (nodes > 30000) break;

    const candidate =
      cur.productId ||
      cur.productID ||
      cur.productCode ||
      cur.product?.id ||
      cur.product?.productId ||
      cur.id;

    if (
      typeof candidate === "number" ||
      (typeof candidate === "string" && /^\d{6,12}$/.test(candidate))
    ) {
      return String(candidate);
    }

    if (Array.isArray(cur)) {
      for (const v of cur) q.push(v);
    } else {
      for (const v of Object.values(cur)) q.push(v);
    }
  }

  return null;
};

// ✅ Extract product images by scanning JSON for images.asos-media.com/products/...
const extractProductImagesFromJson = (json) => {
  if (!json) return [];

  const urls = new Set();
  const q = [json];
  const seen = new Set();
  let nodes = 0;

  while (q.length) {
    const cur = q.shift();
    if (!cur) continue;

    if (typeof cur === "string") {
      if (cur.includes("images.asos-media.com/products/")) {
        const n = normalizeAsosImageUrl(cur);
        if (n) urls.add(n);
      }
      continue;
    }

    if (typeof cur !== "object") continue;
    if (seen.has(cur)) continue;
    seen.add(cur);

    nodes += 1;
    if (nodes > 30000) break;

    if (Array.isArray(cur)) {
      for (const v of cur) q.push(v);
    } else {
      for (const v of Object.values(cur)) q.push(v);
    }
  }

  return Array.from(urls)
    .filter(Boolean)
    .filter((u) => u.includes("images.asos-media.com/products/"));
};

const scrapeHeroAndGalleryDomFallback = async (page) => {
  const urls = await page.$$eval(PDP_HERO_IMG_SEL, (imgs) =>
    imgs
      .map((img) => img.getAttribute("src") || "")
      .filter(Boolean)
      .map((u) => u.split(" ")[0]),
  );

  const uniq = Array.from(new Set(urls))
    .map((u) => (u.startsWith("//") ? `https:${u}` : u))
    .map((u) => u.split(" ")[0]);

  const final = uniq.map(normalizeAsosImageUrl).filter(Boolean);

  return {
    image: final[0] || null,
    images: final,
  };
};

const extractFromJsonLd = async (page) => {
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

      const arr = Array.isArray(data) ? data : [data];

      for (const node of arr) {
        if (!node || typeof node !== "object") continue;

        const offers = node.offers || null;
        const offerArr = Array.isArray(offers)
          ? offers
          : offers
            ? [offers]
            : [];

        for (const o of offerArr) {
          if (!o || typeof o !== "object") continue;
          const price = toNumber(
            o.price ?? o.priceSpecification?.price ?? null,
          );
          const currency = o.priceCurrency || null;
          if (price != null && price > 0) {
            return { price, currency: currency || null };
          }
        }

        const graph = node["@graph"];
        if (Array.isArray(graph)) {
          for (const g of graph) {
            const offers2 = g?.offers || null;
            const offerArr2 = Array.isArray(offers2)
              ? offers2
              : offers2
                ? [offers2]
                : [];
            for (const o of offerArr2) {
              const price = toNumber(
                o?.price ?? o?.priceSpecification?.price ?? null,
              );
              const currency = o?.priceCurrency || null;
              if (price != null && price > 0) {
                return { price, currency: currency || null };
              }
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return { price: null, currency: null };
};

const extractPrices = async ({ page, sr, jsonData }) => {
  const findPriceInJson = (json) => {
    if (!json) return { current: null, previous: null, currency: null };

    const q = [json];
    const seen = new Set();
    let nodes = 0;

    while (q.length) {
      const cur = q.shift();
      if (!cur) continue;

      if (typeof cur !== "object") continue;
      if (seen.has(cur)) continue;
      seen.add(cur);

      nodes += 1;
      if (nodes > 30000) break;

      const currency =
        cur.currency ||
        cur.priceCurrency ||
        cur.current?.currency ||
        cur.previous?.currency ||
        cur.price?.currency ||
        null;

      const current =
        toNumber(cur.current?.value) ??
        toNumber(cur.current?.amount) ??
        toNumber(cur.currentPrice) ??
        toNumber(cur.price?.current?.value) ??
        toNumber(cur.price?.current?.amount) ??
        toNumber(cur.price?.currentPrice) ??
        toNumber(cur.price?.value) ??
        toNumber(cur.price?.amount) ??
        toNumber(cur.price?.amountIncludingTax) ??
        toNumber(cur.amount) ??
        null;

      const previous =
        toNumber(cur.previous?.value) ??
        toNumber(cur.previous?.amount) ??
        toNumber(cur.was) ??
        toNumber(cur.price?.previous?.value) ??
        toNumber(cur.price?.previous?.amount) ??
        toNumber(cur.price?.was) ??
        null;

      if (current != null && current > 0) {
        return {
          current,
          previous: previous ?? null,
          currency: currency ?? null,
        };
      }

      if (Array.isArray(cur)) {
        for (const v of cur) q.push(v);
      } else {
        for (const v of Object.values(cur)) q.push(v);
      }
    }

    return { current: null, previous: null, currency: null };
  };

  const json = findPriceInJson(jsonData);

  const s = String(sr || "");
  const srCurrentMatch =
    s.match(/Now\s*([£$€]?\s*\d+(?:\.\d+)?)/i) ||
    s.match(/Current\s*price\s*([£$€]?\s*\d+(?:\.\d+)?)/i) ||
    s.match(/([£$€]\s*\d+(?:\.\d+)?)/i);
  const srPrevMatch = s.match(/Was\s*([£$€]?\s*\d+(?:\.\d+)?)/i);

  const srCurrent = toNumber(
    srCurrentMatch?.[1] || srCurrentMatch?.[0] || null,
  );
  const srPrev = toNumber(srPrevMatch?.[1] || null);

  const domCurrent = toNumber(await safeText(page, PDP_PRICE_CURRENT_SEL));
  const domPrev = toNumber(await safeText(page, PDP_PRICE_WAS_SEL));

  const metaPrice = toNumber(
    await safeAttr(page, PDP_META_PRICE_SEL, "content"),
  );
  const metaCurrency = await safeAttr(page, PDP_META_CURRENCY_SEL, "content");

  const jsonLd = await extractFromJsonLd(page);

  const scannedPrice = await page
    .evaluate(() => {
      const t = (document.body?.innerText || "").replace(/\s+/g, " ");
      const m =
        t.match(/Now\s*([£$€]\s*\d+(?:\.\d+)?)/i) ||
        t.match(/([£$€]\s*\d+(?:\.\d+)?)/);
      return m ? m[1] || m[0] : null;
    })
    .then((x) => toNumber(x))
    .catch(() => null);

  const price =
    json.current ??
    srCurrent ??
    domCurrent ??
    jsonLd.price ??
    metaPrice ??
    scannedPrice ??
    null;

  const originalPrice = json.previous ?? srPrev ?? domPrev ?? null;

  const currency =
    json.currency ||
    (sr ? parseCurrency(sr) : null) ||
    jsonLd.currency ||
    metaCurrency ||
    "GBP";

  return { price, originalPrice, currency };
};

// ✅ Extract sizes from DOM select/options
const extractSizesFromDom = async (page) => {
  try {
    await page
      .waitForSelector(PDP_SIZE_SELECT_SEL, { timeout: 12000 })
      .catch(() => null);

    const sizesRaw = await page.evaluate(
      ({ selectSel }) => {
        const clean = (t) =>
          String(t || "")
            .replace(/\s+/g, " ")
            .trim();

        const isPlaceholder = (t) => {
          const s = clean(t).toLowerCase();
          return (
            !s ||
            s.includes("please select") ||
            s === "select" ||
            s.includes("choose") ||
            s.includes("size guide") ||
            s.includes("find your fit")
          );
        };

        const looksLikeSizeLabel = (t) => {
          const s = clean(t);
          if (!s) return false;
          if (/(^|\s)(xxs|2xs|xs|s|m|l|xl|xxl|2xl|xxxl)(\s|$)/i.test(s))
            return true;
          if (/\b(uk|us|eu)\s?\d{1,3}\b/i.test(s)) return true;
          if (/^\d{1,3}$/.test(s)) return true;
          return false;
        };

        const selects = Array.from(document.querySelectorAll(selectSel));
        if (!selects.length) return [];

        const scored = selects
          .map((sel) => {
            const opts = Array.from(sel.querySelectorAll("option"));
            const texts = opts
              .map((o) => ({
                text: clean(o.textContent),
                disabled: !!o.disabled,
                value: clean(o.getAttribute("value")),
              }))
              .filter((x) => x.text && !isPlaceholder(x.text));

            const enabledTexts = texts
              .filter((x) => !x.disabled)
              .map((x) => x.text);

            const pool = enabledTexts.length
              ? enabledTexts
              : texts.map((x) => x.text);

            const score = pool.reduce(
              (acc, t) => acc + (looksLikeSizeLabel(t) ? 1 : 0),
              0,
            );

            return { pool, score };
          })
          .sort((a, b) => b.score - a.score);

        const best = scored[0];
        if (!best || best.pool.length === 0) return [];
        return best.pool;
      },
      { selectSel: PDP_SIZE_SELECT_SEL },
    );

    const uniqRaw = Array.from(new Set((sizesRaw || []).filter(Boolean)));
    const sizes = uniqRaw.map((s) => s.trim()).filter(Boolean);

    return { sizesRaw: sizes, sizes };
  } catch {
    return { sizesRaw: [], sizes: [] };
  }
};

// ✅ Fallback: sizes from button list
const extractSizesFromButtons = async (page) => {
  try {
    const sizesRaw = await page.$$eval(PDP_SIZE_BUTTON_SEL, (btns) =>
      btns
        .map((b) => (b.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .filter((t) => !t.toLowerCase().includes("size guide")),
    );

    const uniqRaw = Array.from(new Set((sizesRaw || []).filter(Boolean)));
    const sizes = uniqRaw.map((s) => s.trim()).filter(Boolean);

    return { sizesRaw: sizes, sizes };
  } catch {
    return { sizesRaw: [], sizes: [] };
  }
};

// ✅ Best-effort colors from DOM (COLOUR: WHITE + swatches/links)
const extractColorsFromDom = async (page) => {
  try {
    const data = await page.evaluate(
      ({ swatchSel }) => {
        const clean = (t) =>
          String(t || "")
            .replace(/\s+/g, " ")
            .trim();

        const extractSelected = () => {
          const nodes = Array.from(document.querySelectorAll("body *"));
          for (const el of nodes) {
            const t = clean(el.textContent);
            if (!t) continue;

            // exact label used on ASOS PDP: "COLOUR: WHITE"
            const m = t.match(/^(colour|color)\s*:\s*(.+)$/i);
            if (m && m[2]) return clean(m[2]);
          }

          // fallback: search any element containing "COLOUR:" and take tail
          const html = clean(document.body?.innerText || "");
          const m2 = html.match(
            /(?:^|\s)(COLOUR|COLOR)\s*:\s*([A-Z][A-Za-z0-9\s'/-]{1,40})/i,
          );
          return m2 ? clean(m2[2]) : null;
        };

        const selected = extractSelected();

        const out = new Set();
        if (selected) out.add(selected);

        const links = Array.from(document.querySelectorAll(swatchSel));
        for (const a of links) {
          const aria = clean(a.getAttribute("aria-label"));
          const title = clean(a.getAttribute("title"));
          const txt = clean(a.textContent);

          const img = a.querySelector("img");
          const alt = img ? clean(img.getAttribute("alt")) : "";

          const candidate = aria || title || alt || txt || "";

          const c = clean(candidate)
            .replace(/^selected\s*[:\-]?\s*/i, "")
            .replace(/^colour\s*[:\-]?\s*/i, "")
            .replace(/^color\s*[:\-]?\s*/i, "");

          if (c) out.add(c);
        }

        // last fallback: sometimes swatches are plain buttons with images
        const buttonImgs = Array.from(
          document.querySelectorAll("button img[alt], button img[title]"),
        );
        for (const img of buttonImgs) {
          const alt = clean(img.getAttribute("alt"));
          const title = clean(img.getAttribute("title"));
          const c = clean(alt || title).replace(/^selected\s*[:\-]?\s*/i, "");
          if (c && c.length <= 40) out.add(c);
        }

        return Array.from(out).filter(Boolean);
      },
      { swatchSel: PDP_COLOR_SWATCH_LINK_SEL },
    );

    const uniq = Array.from(
      new Set((data || []).map((x) => String(x).trim()).filter(Boolean)),
    );
    return { colorsRaw: uniq, colors: uniq };
  } catch {
    return { colorsRaw: [], colors: [] };
  }
};

// ✅ Best-effort colors from JSON
const extractColorsFromJson = (json) => {
  if (!json) return { colorsRaw: [], colors: [] };

  const found = new Set();
  const q = [json];
  const seen = new Set();
  let nodes = 0;

  const clean = (t) =>
    String(t || "")
      .replace(/\s+/g, " ")
      .trim();

  const looksLikeColor = (s) => {
    const t = clean(s);
    if (!t) return false;
    if (t.length > 40) return false;
    if (/^\d+$/.test(t)) return false;
    if (/^(uk|us|eu)\s?\d{1,3}$/i.test(t)) return false;
    // allow: "White", "Dark Brown", "Stone / Beige"
    return /^[A-Za-z][A-Za-z0-9\s'/-]{0,39}$/.test(t);
  };

  while (q.length) {
    const cur = q.shift();
    if (!cur) continue;

    if (typeof cur === "string") {
      if (looksLikeColor(cur)) {
        const t = clean(cur);
        if (t) found.add(t);
      }
      continue;
    }

    if (typeof cur !== "object") continue;
    if (seen.has(cur)) continue;
    seen.add(cur);

    nodes += 1;
    if (nodes > 30000) break;

    const candidates = [
      cur.colour,
      cur.color,
      cur.colourName,
      cur.colorName,
      cur.colourwayName,
      cur.colorwayName,
      cur.colourWayName,
      cur.colorWayName,
      cur.baseColour,
      cur.baseColor,
      cur.displayColour,
      cur.displayColor,
      cur.name, // sometimes nested object for colourways
      cur.label,
      cur.value,
    ];

    for (const c of candidates) {
      if (typeof c === "string" && looksLikeColor(c)) found.add(clean(c));
    }

    if (Array.isArray(cur)) {
      for (const v of cur) q.push(v);
    } else {
      for (const v of Object.values(cur)) q.push(v);
    }
  }

  const colors = Array.from(found);
  return { colorsRaw: colors, colors };
};

// ✅ Optional: best-effort sizes from JSON
const extractSizesFromJson = (json) => {
  if (!json) return { sizesRaw: [], sizes: [] };

  const found = new Set();
  const q = [json];
  const seen = new Set();
  let nodes = 0;

  const looksLikeSize = (s) => {
    const t = String(s || "").trim();
    if (!t) return false;
    if (t.length > 24) return false;
    return (
      /^(xxs|2xs|xs|s|m|l|xl|xxl|2xl|xxxl)$/i.test(t) ||
      /^\d{1,3}$/.test(t) ||
      /^(uk|us|eu)\s?\d{1,3}$/i.test(t)
    );
  };

  while (q.length) {
    const cur = q.shift();
    if (!cur) continue;

    if (typeof cur === "string") {
      if (looksLikeSize(cur)) found.add(cur.trim());
      continue;
    }

    if (typeof cur !== "object") continue;
    if (seen.has(cur)) continue;
    seen.add(cur);

    nodes += 1;
    if (nodes > 30000) break;

    const candidate =
      cur.size ||
      cur.sizeName ||
      cur.displaySize ||
      cur.value ||
      cur.label ||
      null;

    if (typeof candidate === "string" && looksLikeSize(candidate)) {
      found.add(candidate.trim());
    }

    if (Array.isArray(cur)) {
      for (const v of cur) q.push(v);
    } else {
      for (const v of Object.values(cur)) q.push(v);
    }
  }

  const sizes = Array.from(found);
  return { sizesRaw: sizes, sizes };
};

const runAsosCrawl = async ({
  startUrls = [],
  maxListPages = 1,
  debug = false,
} = {}) => {
  const results = [];

  const crawler = new PlaywrightCrawler({
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 90,

    async requestHandler({ page, request, enqueueLinks }) {
      const label = (request.label || "LIST").toUpperCase();

      if (label === "LIST") {
        try {
          await page.waitForSelector(LIST_READY_SEL, { timeout: 20000 });
        } catch {
          if (debug) console.log("❌ LIST wait failed:", request.url);
          return;
        }

        const tileCount = await page.locator(LIST_TILES_SEL).count();
        if (!tileCount) {
          if (debug) console.log("⚠️ LIST empty:", request.url);
          return;
        }

        await enqueueLinks({
          selector: LIST_LINKS_SEL,
          label: "DETAIL",
          userData: request.userData || {},
        });

        const pageNum = Number(request.userData?.page || 1);
        const baseUrl = request.userData?.baseUrl || request.url;

        if (pageNum < maxListPages) {
          const nextPage = pageNum + 1;

          const nextUrl = (() => {
            try {
              const u = new URL(baseUrl);
              u.searchParams.set("page", String(nextPage));
              return u.toString();
            } catch {
              const sep = baseUrl.includes("?") ? "&" : "?";
              return `${baseUrl}${sep}page=${nextPage}`;
            }
          })();

          await enqueueLinks({
            urls: [
              {
                url: nextUrl,
                label: "LIST",
                userData: {
                  ...(request.userData || {}),
                  page: nextPage,
                  baseUrl,
                },
              },
            ],
          });
        }

        return;
      }

      // DETAIL
      try {
        await page.waitForSelector(PDP_TITLE_SEL, { timeout: 20000 });
        await page
          .waitForSelector(
            `${PDP_PRICE_SR_SEL}, ${PDP_PRICE_CURRENT_SEL}, ${PDP_META_PRICE_SEL}, ${PDP_JSONLD_SEL}`,
            { timeout: 20000 },
          )
          .catch(() => null);
      } catch {
        if (debug) console.log("❌ DETAIL wait failed:", request.url);
        return;
      }

      const title =
        (await page
          .$eval(PDP_TITLE_SEL, (el) => el.textContent?.trim() || "")
          .catch(() => "")) || null;

      const sr =
        (await page
          .$eval(PDP_PRICE_SR_SEL, (el) => el.textContent?.trim() || "")
          .catch(() => "")) || "";

      const productUrl = request.url;

      const { key: jsonKey, data: jsonData } = await getAsosPdpJson(page);
      const productId = extractProductIdFromJson(jsonData);

      const { price, originalPrice, currency } = await extractPrices({
        page,
        sr,
        jsonData,
      });

      const discMatch = String(sr || "").match(/\((-?\d+)%\)/);
      const discountPercent = discMatch ? toNumber(discMatch[1]) : null;

      const jsonImages = extractProductImagesFromJson(jsonData);
      const dom = await scrapeHeroAndGalleryDomFallback(page);

      const images = jsonImages.length ? jsonImages : dom.images;
      const image = images[0] || dom.image || null;

      // ✅ colors (JSON → DOM)
      const jsonColors = extractColorsFromJson(jsonData);
      const domColors = await extractColorsFromDom(page);

      const colorsRaw = jsonColors.colorsRaw.length
        ? jsonColors.colorsRaw
        : domColors.colorsRaw.length
          ? domColors.colorsRaw
          : [];

      const colors = jsonColors.colors.length
        ? jsonColors.colors
        : domColors.colors.length
          ? domColors.colors
          : [];

      // ✅ sizes (JSON → select → buttons)
      const jsonSizes = extractSizesFromJson(jsonData);
      const domSizes1 = await extractSizesFromDom(page);
      const domSizes2 = domSizes1.sizes.length
        ? { sizesRaw: [], sizes: [] }
        : await extractSizesFromButtons(page);

      const sizesRaw = jsonSizes.sizesRaw.length
        ? jsonSizes.sizesRaw
        : domSizes1.sizesRaw.length
          ? domSizes1.sizesRaw
          : domSizes2.sizesRaw;

      const sizes = jsonSizes.sizes.length
        ? jsonSizes.sizes
        : domSizes1.sizes.length
          ? domSizes1.sizes
          : domSizes2.sizes;

      const inStock = Array.isArray(sizes) ? sizes.length > 0 : true;

      const store = "asos";
      const storeName = "ASOS";
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
          console.log("⚠️ SKIP missing required fields:", {
            url: productUrl,
            title: doc.title,
            price: doc.price,
            currency: doc.currency,
            image: doc.image,
            imagesLen: doc.images?.length || 0,
            jsonKey,
            productId,
            sr: sr || null,
          });
        }
        return;
      }

      if (debug) {
        const required = {
          canonicalKey: doc.canonicalKey,
          store: doc.store,
          storeName: doc.storeName,
          title: doc.title,
          price: doc.price,
          currency: doc.currency,
          image: doc.image,
          productUrl: doc.productUrl,
        };

        const optional = {
          originalPrice: doc.originalPrice,
          discountPercent: doc.discountPercent,
          imagesLength: doc.images?.length || 0,
          imagesSample: (doc.images || []).slice(0, 5),
          saleUrl: doc.saleUrl,
          category: doc.category,
          gender: doc.gender,
          colors: doc.colors,
          sizesRaw: doc.sizesRaw,
          sizes: doc.sizes,
          inStock: doc.inStock,
          status: doc.status,
          lastSeenAt: doc.lastSeenAt,
        };

        const debugMeta = {
          jsonKey,
          productId,
          sourceImages: jsonImages.length ? "JSON" : "DOM_FALLBACK",
          sr: sr || null,
          colorSource: jsonColors.colors.length
            ? "JSON"
            : domColors.colors.length
              ? "DOM"
              : "NONE",
          sizeSource: jsonSizes.sizes.length
            ? "JSON"
            : domSizes1.sizes.length
              ? "DOM_SELECT"
              : domSizes2.sizes.length
                ? "DOM_BUTTONS"
                : "NONE",
          sizeSelectFound: await page
            .$(PDP_SIZE_SELECT_SEL)
            .then(Boolean)
            .catch(() => false),
          sizeSelectIdVariantSelectorFound: await page
            .$("select#variantSelector")
            .then(Boolean)
            .catch(() => false),
          sizeOptionCount: await page
            .locator("select#variantSelector option")
            .count()
            .catch(() => null),
          colorSwatchLinkCount: await page
            .locator(PDP_COLOR_SWATCH_LINK_SEL)
            .count()
            .catch(() => null),
        };

        console.log("🟩 PRODUCT_DOC_REQUIRED", required);
        console.log("🟦 PRODUCT_DOC_OPTIONAL", optional);
        console.log("🟨 PRODUCT_DOC_DEBUG_META", debugMeta);

        const missingRequired = Object.entries(required)
          .filter(([, v]) => v == null || v === "")
          .map(([k]) => k);

        if (missingRequired.length) {
          console.log("⚠️ MISSING_REQUIRED_FIELDS", missingRequired);
        }
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
      userData: { ...userData, baseUrl: url, page: 1 },
    };
  });

  if (debug) console.log("🌱 SEEDS", seeds);

  await crawler.run(seeds);

  const map = new Map();
  for (const p of results) map.set(p.canonicalKey, p);

  return Array.from(map.values());
};

module.exports = { runAsosCrawl };
