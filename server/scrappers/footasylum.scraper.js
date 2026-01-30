// server/scrappers/footasylum.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const { makeCanonicalKey } = require("../utils/canonical");

const DEFAULT_START_URLS = [
  {
    url: "https://www.footasylum.com/mens/mens-clothing/jackets-coats/",
    userData: { gender: "men", category: "jackets-coats" },
  },
];

const ORIGIN = "https://www.footasylum.com";

const LIST_READY_SEL = "#productDataOnPage";
const LIST_TILE_SEL = 'div[id^="ui-product-"]';

const PDP_TITLE_READY_SEL = "section.title";
const PDP_SIZE_WRAPPER_SEL = "#sizes-scroll-wrapper-id";

const toNumber = (val) => {
  if (val == null) return null;
  const n = Number(String(val).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const absolutize = (u, base = ORIGIN) => {
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

const canonicalizeFootasylumPdpUrl = (rawUrl = "") => {
  try {
    const u = new URL(String(rawUrl));
    u.hash = "";
    [
      "page",
      "columns",
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

const isFootasylumPdpUrl = (rawUrl = "") => {
  try {
    const u = new URL(String(rawUrl));
    if (!u.hostname.includes("footasylum.com")) return false;
    const p = u.pathname.toLowerCase();
    if (/-\d{5,}\/?$/.test(p)) return true;
    const segs = p.split("/").filter(Boolean);
    const isGenderRoot = ["men", "women", "kids", "mens", "womens"].includes(
      segs[0],
    );
    if (!isGenderRoot) return false;
    const last = segs[segs.length - 1] || "";
    return segs.length >= 4 && last.length >= 12 && last.includes("-");
  } catch {
    return /-\d{5,}\/?$/.test(String(rawUrl));
  }
};

const isLikelyPdpUrl = (u = "") => {
  const s = String(u);
  if (!s || s.includes("/payday-top-picks/") || s.startsWith("javascript:"))
    return false;
  return isFootasylumPdpUrl(s);
};

const extractListTiles = async (page, baseUrl) => {
  const ready = await Promise.race([
    page.waitForSelector(LIST_READY_SEL, { timeout: 25000 }).then(() => "meta"),
    page.waitForSelector(LIST_TILE_SEL, { timeout: 25000 }).then(() => "tiles"),
  ]).catch(() => null);

  if (!ready) return [];

  const tiles = await page
    .$$eval(LIST_TILE_SEL, (nodes) => {
      return (nodes || []).map((tile) => {
        const a = tile.querySelector("a[href]");
        return {
          href: a ? a.getAttribute("href") : null,
          priceAttr: tile.getAttribute("data-nq-product-price"),
        };
      });
    })
    .catch(() => []);

  const seen = new Set();
  return tiles
    .map((t) => ({ ...t, url: t.href ? absolutize(t.href, baseUrl) : null }))
    .filter((t) => t.url && isLikelyPdpUrl(t.url))
    .map((t) => ({ ...t, url: canonicalizeFootasylumPdpUrl(t.url) }))
    .filter((x) => !seen.has(x.url) && seen.add(x.url));
};

const getMaxPagesFromDom = async (page) => {
  try {
    const v = await page.getAttribute(LIST_READY_SEL, "data-nq-maxpages");
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
};

const computeNextListUrl = (currentUrl, nextPageNum) => {
  try {
    const u = new URL(String(currentUrl));
    u.searchParams.set("page", String(nextPageNum));
    return u.toString();
  } catch {
    return null;
  }
};

const extractPdpCore = async (page) => {
  const out = {
    brand: null,
    item: null,
    title: null,
    price: null,
    currency: "GBP",
    color: null,
    images: [],
    sizesRaw: [],
    sizes: [],
    inStock: false,
  };

  await page
    .waitForSelector(PDP_TITLE_READY_SEL, { state: "attached", timeout: 15000 })
    .catch(() => {});

  try {
    const res = await page.evaluate(() => {
      const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
      const root = document.querySelector("section.title") || document.body;

      const brandEl = root.querySelector("span.brand");
      const itemEl = root.querySelector("span.item");
      const priceEl =
        root.querySelector("span.block.text-lg.font-bold") ||
        root.querySelector("span.text-lg");

      let priceText = clean(priceEl?.textContent || "");
      if (!priceText.includes("£")) {
        const m = root.innerText.match(/£\s*\d+(?:\.\d{1,2})?/);
        priceText = m ? m[0] : "";
      }

      let color = "";
      const colourP = Array.from(document.querySelectorAll("p")).find((p) =>
        p.textContent.toLowerCase().includes("colour"),
      );
      color = clean(colourP?.querySelector("span")?.textContent || "");

      return {
        brand: clean(brandEl?.textContent),
        item: clean(itemEl?.textContent),
        priceText,
        color,
      };
    });

    out.brand = res.brand;
    out.item = res.item;
    out.title = [out.brand, out.item].filter(Boolean).join(" ");
    out.price = toNumber(res.priceText);
    out.color = res.color;
  } catch {}

  try {
    const imgUrls = await page.$$eval('img[src*="/products/"]', (imgs) =>
      imgs
        .map((img) => img.src)
        .filter((src) => src.includes("large") || src.includes("xlarge")),
    );
    out.images = Array.from(new Set(imgUrls));
  } catch {}

  try {
    await page
      .waitForSelector(PDP_SIZE_WRAPPER_SEL, { timeout: 5000 })
      .catch(() => {});
    const sizeRes = await page.evaluate(() => {
      const wrapper = document.querySelector("#sizes-scroll-wrapper-id");
      if (!wrapper) return { sizes: [], inStock: false };

      const btns = Array.from(wrapper.querySelectorAll('[role="button"]'));
      const found = btns
        .map((b) => {
          const val =
            b.querySelector(".size-value")?.textContent || b.textContent;
          return { val: (val || "").trim() };
        })
        .filter((s) => s.val && s.val.length > 0);

      return {
        sizes: found.map((s) => s.val),
        inStock: found.length > 0,
      };
    });
    out.sizesRaw = sizeRes.sizes;
    out.sizes = sizeRes.sizes;
    out.inStock = sizeRes.inStock;
  } catch {}

  return out;
};

const runFootasylumCrawl = async ({
  startUrls = [],
  maxListPages = 1,
  maxProducts = 0,
  debug = false,
} = {}) => {
  const results = [];

  const crawler = new PlaywrightCrawler({
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 180,
    launchContext: {
      launchOptions: {
        headless: true,
        args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
      },
    },
    preNavigationHooks: [
      async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.setExtraHTTPHeaders({ "accept-language": "en-GB,en;q=0.9" });
      },
    ],
    requestHandler: async ({ page, request, crawler }) => {
      const isPdp = isFootasylumPdpUrl(request.url);

      if (!isPdp) {
        await page
          .waitForSelector(LIST_READY_SEL, { timeout: 20000 })
          .catch(() => {});

        const tiles = await extractListTiles(page, request.url);
        let pdpUrls = tiles.map((t) => t.url);

        if (maxProducts > 0) pdpUrls = pdpUrls.slice(0, maxProducts);

        // ✅ Correct API: use crawler.addRequests (requestQueue not passed in Crawlee v3)
        await crawler.addRequests(
          pdpUrls.map((url) => ({
            url,
            label: "DETAIL",
            userData: request.userData,
            uniqueKey: url,
          })),
        );

        const domMax = await getMaxPagesFromDom(page);
        const currentP = request.userData?.page || 1;
        if (currentP < Math.min(domMax || 1, maxListPages)) {
          const next = computeNextListUrl(request.url, currentP + 1);
          if (next) {
            await crawler.addRequests([
              {
                url: next,
                label: "LIST",
                userData: { ...request.userData, page: currentP + 1 },
                uniqueKey: next,
              },
            ]);
          }
        }

        return;
      }

      const core = await extractPdpCore(page);
      const productUrl = canonicalizeFootasylumPdpUrl(page.url());

      const doc = {
        canonicalKey: makeCanonicalKey({ store: "footasylum", productUrl }),
        store: "footasylum",
        storeName: "Footasylum",
        ...core,
        productUrl,
        image: core.images[0] || null,
        lastSeenAt: new Date(),
        status: "active",
      };

      if (debug && doc.title) {
        console.log(
          `🟩 Extracted: ${doc.title} - £${doc.price} - InStock: ${doc.inStock}`,
        );
      }

      if (doc.title) results.push(doc);
    },
  });

  const seeds = (startUrls.length ? startUrls : DEFAULT_START_URLS).map(
    (u) => ({
      url: typeof u === "string" ? u : u.url,
      label: "LIST",
      userData: { ...(u.userData || {}), page: 1 },
      uniqueKey: canonicalizeFootasylumPdpUrl(
        typeof u === "string" ? u : u.url,
      ),
    }),
  );

  await crawler.run(seeds);
  return results;
};

module.exports = { runFootasylumCrawl };
