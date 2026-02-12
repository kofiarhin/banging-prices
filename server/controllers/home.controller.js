// server/controllers/home.controller.js
const Product = require("../models/product.model");

// ✅ Configurable "active" window (default 24h so UI doesn't look broken on daily crawls)
const ACTIVE_WINDOW_HOURS = Number(process.env.ACTIVE_WINDOW_HOURS || 24);
const ACTIVE_WINDOW_MS = ACTIVE_WINDOW_HOURS * 60 * 60 * 1000;

// --- Helper Utilities ---
const pickCardFields = (p) => ({
  _id: p._id,
  title: p.title,
  store: p.store,
  storeName: p.storeName,
  price: p.price,
  currency: p.currency,
  originalPrice: p.originalPrice,
  discountPercent: p.discountPercent,
  image: p.image,
});

const escapeRegex = (s = "") =>
  String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const makeContainsRegex = (s = "") => new RegExp(escapeRegex(s), "i");

const toSlug = (s = "") =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const cap = (s = "") =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

const uniqNonEmpty = (arr = []) => [
  ...new Set((arr || []).map((x) => String(x || "").trim()).filter(Boolean)),
];

/* --- Hero Carousel Logic --- */
const buildHeroCarousel = async () => {
  const slideDefs = [
    { key: "hoodies", label: "Hoodies", query: ["hoodie", "sweatshirt"] },
    { key: "coats", label: "Coats & Jackets", query: ["coat", "jacket"] },
    {
      key: "trainers",
      label: "Trainers",
      query: ["trainer", "sneaker", "shoe"],
    },
    { key: "bags", label: "Bags", query: ["bag", "backpack"] },
  ];

  const slides = await Promise.all(
    slideDefs.map(async (s) => {
      const or = s.query.map((q) => ({ category: makeContainsRegex(q) }));

      let items = await Product.find(or.length ? { $or: or } : {})
        .sort({ discountPercent: -1, createdAt: -1 })
        .limit(4)
        .select(
          "_id title store storeName price currency originalPrice discountPercent image",
        )
        .lean();

      if (items.length < 4) {
        items = await Product.find({})
          .sort({ discountPercent: -1, createdAt: -1 })
          .limit(4)
          .select(
            "_id title store storeName price currency originalPrice discountPercent image",
          )
          .lean();
      }

      return {
        key: s.key,
        label: s.label,
        to: `/products?q=${encodeURIComponent(s.label)}&sort=discount-desc&page=1`,
        items: items.map(pickCardFields),
      };
    }),
  );

  return slides.filter((x) => (x.items || []).length);
};

/* --- Main Actions --- */
const getHomeIntelligence = async (req, res) => {
  try {
    const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);

    const [
      retailersTotal,
      retailersActive,
      assetsTracked,
      latestSeen,
      heroCarousel,
    ] = await Promise.all([
      Product.distinct("store"),
      Product.distinct("store", { lastSeenAt: { $gte: activeSince } }),
      Product.countDocuments(),
      Product.findOne({ lastSeenAt: { $ne: null } }, { lastSeenAt: 1 })
        .sort({ lastSeenAt: -1 })
        .lean(),
      buildHeroCarousel(),
    ]);

    const lastScanSecondsAgo = latestSeen?.lastSeenAt
      ? Math.floor((Date.now() - new Date(latestSeen.lastSeenAt)) / 1000)
      : null;

    const limit = Math.min(24, Math.max(6, Number(req.query.limit) || 12));

    const querySpecs = [
      {
        id: "biggest-drops",
        title: "Biggest drops",
        subtitle: "Highest verified discounts right now.",
        seeAllUrl: "/products?sort=discount-desc&page=1",
        filter: { discountPercent: { $gt: 0 } },
        sort: { discountPercent: -1, createdAt: -1 },
      },
      {
        id: "under-20",
        title: "Under £20",
        subtitle: "Low price, high value.",
        seeAllUrl: "/products?maxPrice=20&sort=discount-desc&page=1",
        filter: { price: { $lte: 20 } },
        sort: { discountPercent: -1, createdAt: -1 },
      },
      {
        id: "newly-detected",
        title: "Newly detected",
        subtitle: "Fresh items added to the feed.",
        seeAllUrl: "/products?sort=newest&page=1",
        filter: {},
        sort: { createdAt: -1 },
      },
      {
        id: "men",
        title: "Men",
        subtitle: "Top value for men right now.",
        seeAllUrl: "/products?gender=men&sort=discount-desc&page=1",
        filter: { gender: "men" },
        sort: { discountPercent: -1, createdAt: -1 },
      },
      {
        id: "women",
        title: "Women",
        subtitle: "Top value for women right now.",
        seeAllUrl: "/products?gender=women&sort=discount-desc&page=1",
        filter: { gender: "women" },
        sort: { discountPercent: -1, createdAt: -1 },
      },
    ];

    const sectionDocs = await Promise.all(
      querySpecs.map((spec) =>
        Product.find(spec.filter)
          .sort(spec.sort)
          .limit(limit)
          .select(
            "_id title store storeName price currency originalPrice discountPercent image",
          )
          .lean(),
      ),
    );

    const sections = querySpecs
      .map((spec, i) => {
        const items = sectionDocs[i].map(pickCardFields);
        return {
          id: spec.id,
          title: spec.title,
          subtitle: spec.subtitle,
          seeAllUrl: spec.seeAllUrl,
          image: items[0]?.image || "",
          items,
        };
      })
      .filter((s) => s.items.length > 0);

    return res.json({
      system: {
        // ✅ monitored = total distinct stores (stable number)
        retailersMonitored: retailersTotal.length,

        // ✅ "online" = active within window (default 24h)
        retailersOnline: retailersActive.length,
        activeWindowHours: ACTIVE_WINDOW_HOURS,

        assetsTracked,
        lastScanSecondsAgo,
      },
      carousel: { slides: heroCarousel },
      sections,
    });
  } catch (err) {
    console.error("Home intelligence error:", err);
    return res
      .status(500)
      .json({ message: "Failed to load home intelligence" });
  }
};

const getNav = async (req, res) => {
  try {
    const categoriesLimit = Math.max(
      1,
      Math.min(Number(req.query.categoriesLimit || 10), 24),
    );
    const storesLimit = Math.max(
      1,
      Math.min(Number(req.query.storesLimit || 10), 24),
    );

    const [rawGenders, storesAgg, categoriesAgg] = await Promise.all([
      Product.distinct("gender"),

      Product.aggregate([
        {
          $project: {
            storeValue: { $ifNull: ["$store", ""] },
            storeLabel: {
              $trim: { input: { $ifNull: ["$storeName", "$store"] } },
            },
          },
        },
        { $match: { storeValue: { $ne: "" }, storeLabel: { $ne: "" } } },
        {
          $group: {
            _id: "$storeValue",
            label: { $first: "$storeLabel" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, label: 1 } },
        { $limit: storesLimit },
      ]),

      Product.aggregate([
        {
          $match: {
            gender: { $in: ["men", "women", "kids"] },
            category: { $type: "string", $ne: "" },
          },
        },
        {
          $project: {
            gender: { $toLower: { $trim: { input: "$gender" } } },
            category: { $toLower: { $trim: { input: "$category" } } },
          },
        },
        {
          $group: {
            _id: { gender: "$gender", category: "$category" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        {
          $group: {
            _id: "$_id.gender",
            categories: { $push: "$_id.category" },
          },
        },
      ]),
    ]);

    const genders = uniqNonEmpty(rawGenders)
      .map((g) => String(g).trim().toLowerCase())
      .filter(Boolean)
      .map((g) => ({
        key: toSlug(g),
        label: cap(g),
        value: g,
        to: `/products?gender=${encodeURIComponent(g)}&page=1`,
      }));

    const topStores = (storesAgg || []).map((s) => ({
      key: toSlug(s._id),
      label: s.label,
      value: s._id,
      to: `/products?store=${encodeURIComponent(s._id)}&page=1`,
    }));

    const topCategoriesByGender = { men: [], women: [], kids: [] };

    (categoriesAgg || []).forEach((row) => {
      const g = String(row._id || "")
        .trim()
        .toLowerCase();
      if (!topCategoriesByGender[g]) return;

      const uniq = [];
      const seen = new Set();

      for (const c of row.categories || []) {
        const v = String(c || "")
          .trim()
          .toLowerCase();
        if (!v) continue;
        if (seen.has(v)) continue;
        seen.add(v);
        uniq.push(v);
        if (uniq.length >= categoriesLimit) break;
      }

      topCategoriesByGender[g] = uniq;
    });

    return res.json({
      genders,
      topStores,
      topCategoriesByGender,
      meta: {
        categoriesLimit,
        storesLimit,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Home nav error:", err);
    return res.status(500).json({ message: "Failed to load nav" });
  }
};

module.exports = { getHomeIntelligence, getNav };
