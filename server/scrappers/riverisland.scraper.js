// server/scrappers/riverisland.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const crypto = require("crypto");

const { makeCanonicalKey } = require("../utils/canonical");

const DEFAULT_START_URLS = [
  {
    url: "https://www.riverisland.com/c/women/tops?f-cat=hoodies&f-cat=sweatshirts",
    userData: { gender: "women", category: "hoodies-sweatshirts" },
  },
];

const LIST_READY_SEL = 'img[data-qa="product-image"]';
const LIST_LINKS_SEL = 'a[href^="/p/"]';

const PDP_ROOT_SEL = 'section[data-cs-override-id="product-details"]';
const PDP_TITLE_SEL = `${PDP_ROOT_SEL} h1`;

const PDP_SIZE_BUTTON_SEL = 'li[data-qa="size-box"] [role="button"]';

const PDP_JSONLD_SEL = 'script[type="application/ld+json"]';
const PDP_META_PRICE_SEL =
  'meta[itemprop="price"], meta[property="product:price:amount"]';
const PDP_META_CURRENCY_SEL =
  'meta[itemprop="priceCurrency"], meta[property="product:price:currency"]';

const PDP_IMG_SEL = `${PDP_ROOT_SEL} img[src], ${PDP_ROOT_SEL} img[srcset]`;

const sha1 = (s) => crypto.createHash("sha1").update(String(s)).digest("hex");

const toNumber = (val) => {
  if (val == null) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
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
  const out = {
    price: null,
    currency: null,
    originalPrice: null,
    title: null,
    images: [],
    color: null,
  };

  try {
    const blocks = await page.$$eval(PDP_JSONLD_SEL, (els) =>
      els
        .map((e) => (e.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 10),
    );

    const pushImage = (u) => {
      if (!u) return;
      out.images.push(u);
    };

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

        if (typeof node.name === "string" && !out.title) out.title = node.name;
        if (typeof node.color === "string" && !out.color)
          out.color = node.color;

        if (node.image) {
          if (Array.isArray(node.image)) node.image.forEach(pushImage);
          else if (typeof node.image === "string") pushImage(node.image);
        }

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

          // best-effort "was" price
          const high = toNumber(o.highPrice ?? null);
          const low = toNumber(o.lowPrice ?? null);
          if (high != null && high > 0 && out.originalPrice == null) {
            if (out.price != null && high > out.price) out.originalPrice = high;
          } else if (low != null && low > 0 && out.originalPrice == null) {
            if (out.price != null && low > out.price) out.originalPrice = low;
          }
        }

        const graph = node["@graph"];
        if (Array.isArray(graph)) {
          for (const g of graph) {
            if (!g || typeof g !== "object") continue;
            if (typeof g.name === "string" && !out.title) out.title = g.name;
            if (typeof g.color === "string" && !out.color) out.color = g.color;

            if (g.image) {
              if (Array.isArray(g.image)) g.image.forEach(pushImage);
              else if (typeof g.image === "string") pushImage(g.image);
            }

            const offers2 = g.offers;
            const offerArr2 = Array.isArray(offers2)
              ? offers2
              : offers2
                ? [offers2]
                : [];

            for (const o of offerArr2) {
              const p = toNumber(
                o?.price ?? o?.priceSpecification?.price ?? null,
              );
              const c = o?.priceCurrency || null;
              if (p != null && p > 0 && out.price == null) out.price = p;
              if (c && !out.currency) out.currency = c;
            }
          }
        }
      }

      if (out.price != null && out.currency) break;
    }
  } catch {
    // ignore
  }

  out.images = Array.from(new Set(out.images.map(String))).filter(Boolean);
  return out;
};

const extractDomPrices = async (page) => {
  // strictly scan within product-details, not whole body
  try {
    const res = await page.evaluate(
      ({ rootSel }) => {
        const root = document.querySelector(rootSel);
        if (!root) return { priceText: null, wasText: null };

        const text = (root.innerText || "").replace(/\s+/g, " ").trim();

        // current price: first £xx.xx near title area (best-effort)
        const priceMatch =
          text.match(/£\s*\d+(?:\.\d{1,2})?/i) ||
          text.match(/\b\d+(?:\.\d{1,2})?\s*GBP\b/i);

        // was price: "Was £xx.xx" or similar
        const wasMatch =
          text.match(/Was\s*(£\s*\d+(?:\.\d{1,2})?)/i) ||
          text.match(/Was\s*(\d+(?:\.\d{1,2})?)/i);

        return {
          priceText: priceMatch ? priceMatch[0] : null,
          wasText: wasMatch ? wasMatch[1] || wasMatch[0] : null,
        };
      },
      { rootSel: PDP_ROOT_SEL },
    );

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
        const push = (u) => {
          if (!u) return;
          out.push(u);
        };

        for (const img of imgs) {
          const srcset = img.getAttribute("srcset") || "";
          const src = img.getAttribute("src") || "";

          // store both; caller will pick largest srcset
          if (srcset) push(`SRCSET:${srcset}`);
          if (src) push(`SRC:${src}`);
        }

        return out;
      },
      { imgSel: PDP_IMG_SEL },
    );

    const expanded = [];

    for (const u of urls) {
      if (u.startsWith("SRCSET:")) {
        const raw = u.replace(/^SRCSET:/, "");
        const picked = pickLargestFromSrcset(raw);
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
      .waitForSelector(PDP_SIZE_BUTTON_SEL, { timeout: 12000 })
      .catch(() => null);

    const sizesRaw = await page.$$eval(PDP_SIZE_BUTTON_SEL, (btns) =>
      btns
        .map((b) => (b.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean),
    );

    const uniq = Array.from(new Set((sizesRaw || []).filter(Boolean)));

    // Light filter: exclude non-sizes if any slip in
    const sizes = uniq.filter((s) => {
      const t = String(s).trim();
      if (!t) return false;
      if (t.length > 24) return false;
      if (/size\s*guide/i.test(t)) return false;
      return true;
    });

    return { sizesRaw: sizes, sizes };
  } catch {
    return { sizesRaw: [], sizes: [] };
  }
};

const extractColorsBestEffort = async (page, jsonldColor) => {
  if (jsonldColor) return [String(jsonldColor).trim()].filter(Boolean);

  // conservative DOM scan within product-details
  try {
    const c = await page.evaluate(
      ({ rootSel }) => {
        const root = document.querySelector(rootSel);
        if (!root) return null;

        const text = (root.innerText || "").replace(/\s+/g, " ").trim();

        // Common patterns: "Colour: Black" / "Color: Black"
        const m = text.match(
          /(?:Colour|Color)\s*:\s*([A-Za-z0-9\s'/-]{1,40})/i,
        );
        if (!m || !m[1]) return null;

        const v = m[1].trim();
        if (!v) return null;
        if (v.length > 40) return null;
        return v;
      },
      { rootSel: PDP_ROOT_SEL },
    );

    return c ? [c] : [];
  } catch {
    return [];
  }
};

const runRiverIslandCrawl = async ({
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
          if (debug) console.log("❌ RI LIST wait failed:", request.url);
          return;
        }

        // Collect absolute PDP links ourselves (more reliable than enqueueLinks resolving)
        const hrefs = await page
          .$$eval(LIST_LINKS_SEL, (as) =>
            Array.from(
              new Set(
                as.map((a) => a.getAttribute("href") || "").filter(Boolean),
              ),
            ),
          )
          .catch(() => []);

        if (!hrefs.length) {
          if (debug) console.log("⚠️ RI LIST no links:", request.url);
          return;
        }

        const absLinks = hrefs
          .map((h) => {
            try {
              return new URL(h, window.location.origin).toString();
            } catch {
              return h;
            }
          })
          .filter(Boolean);

        await enqueueLinks({
          urls: absLinks.map((u) => ({
            url: u,
            label: "DETAIL",
            userData: request.userData || {},
          })),
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
        await page.waitForSelector(PDP_ROOT_SEL, { timeout: 20000 });
        await page.waitForSelector(PDP_TITLE_SEL, { timeout: 20000 });
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

      const price = jsonld.price ?? metaPrice ?? domPrices.price ?? null;

      const originalPrice =
        jsonld.originalPrice ?? domPrices.originalPrice ?? null;

      const currency = (jsonld.currency || metaCurrency || "GBP").toUpperCase();

      const imagesFromDom = await extractImagesFromDom(page, productUrl);
      const imagesFromJsonLd = (jsonld.images || [])
        .map((u) => absolutize(u, productUrl))
        .filter(Boolean);

      const images = Array.from(
        new Set(
          [...imagesFromDom, ...imagesFromJsonLd]
            .map((u) => String(u).trim())
            .filter(Boolean),
        ),
      );

      const image = images[0] || null;

      const sizes = await extractSizesFromDom(page);
      const inStock = Array.isArray(sizes.sizes)
        ? sizes.sizes.length > 0
        : true;

      const colors = await extractColorsBestEffort(page, jsonld.color);

      const store = "riverisland";
      const storeName = "River Island";
      const canonicalKey = makeCanonicalKey({ store, productUrl });

      const gender = request.userData?.gender || null;
      const category = request.userData?.category || null;
      const saleUrl = request.userData?.baseUrl || null;

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
        originalPrice: originalPrice || null,
        discountPercent,
        image,
        images,
        productUrl,
        saleUrl,
        category,
        gender,
        colors,
        sizesRaw: sizes.sizesRaw,
        sizes: sizes.sizes,
        inStock,
        status: "active",
        lastSeenAt: new Date(),
      };

      const missing =
        !doc.canonicalKey ||
        !doc.store ||
        !doc.storeName ||
        !doc.title ||
        doc.price == null ||
        !doc.currency ||
        !doc.image ||
        !doc.productUrl;

      if (missing) {
        if (debug) {
          console.log("⚠️ RI SKIP missing required fields:", {
            url: productUrl,
            title: doc.title,
            price: doc.price,
            currency: doc.currency,
            image: doc.image,
            imagesLen: doc.images?.length || 0,
            sizes: doc.sizes,
            colors: doc.colors,
          });
        }
        return;
      }

      if (debug) {
        console.log("🟩 RI PRODUCT_DOC_REQUIRED", {
          canonicalKey: doc.canonicalKey,
          store: doc.store,
          storeName: doc.storeName,
          title: doc.title,
          price: doc.price,
          currency: doc.currency,
          image: doc.image,
          productUrl: doc.productUrl,
        });

        console.log("🟦 RI PRODUCT_DOC_OPTIONAL", {
          originalPrice: doc.originalPrice,
          discountPercent: doc.discountPercent,
          imagesLength: doc.images?.length || 0,
          imagesSample: (doc.images || []).slice(0, 6),
          saleUrl: doc.saleUrl,
          category: doc.category,
          gender: doc.gender,
          colors: doc.colors,
          sizesRaw: doc.sizesRaw,
          sizes: doc.sizes,
          inStock: doc.inStock,
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

  if (debug) console.log("🌱 RI SEEDS", seeds);

  await crawler.run(seeds);

  // de-dupe by canonicalKey
  const map = new Map();
  for (const p of results) map.set(p.canonicalKey, p);

  return Array.from(map.values());
};

module.exports = { runRiverIslandCrawl };
