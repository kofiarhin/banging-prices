const Product = require("../models/product.model");

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

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

const parsePathQuery = (to = "") => {
  const str = String(to || "");
  const [path, qs = ""] = str.split("?");
  const params = new URLSearchParams(qs);
  return { path, params };
};

const buildTo = (path, params) => {
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

const withGender = (to, gender) => {
  if (!to || !gender) return to;
  const { path, params } = parsePathQuery(to);

  // only scope /products routes
  if (!String(path).startsWith("/products")) return to;

  if (!params.get("gender")) params.set("gender", gender);
  if (!params.get("page")) params.set("page", "1");

  return buildTo(path, params);
};

const classifyCategoryBucket = (name = "") => {
  const s = String(name || "").toLowerCase();

  const shoes = [
    "shoe",
    "shoes",
    "trainer",
    "trainers",
    "sneaker",
    "sneakers",
    "boot",
    "boots",
    "sandal",
    "sandals",
    "flip",
    "slipper",
  ];

  const clothing = [
    "hoodie",
    "hoodies",
    "sweatshirt",
    "sweatshirts",
    "t-shirt",
    "tshirts",
    "tee",
    "tees",
    "top",
    "tops",
    "trouser",
    "trousers",
    "pants",
    "jean",
    "jeans",
    "short",
    "shorts",
    "jacket",
    "jackets",
    "coat",
    "coats",
    "legging",
    "leggings",
    "bra",
    "bras",
    "tracksuit",
    "track",
    "dress",
    "skirt",
    "sock",
    "socks",
  ];

  const sport = [
    "running",
    "run",
    "gym",
    "training",
    "football",
    "soccer",
    "basketball",
    "tennis",
    "yoga",
    "golf",
    "trail",
    "hike",
    "hiking",
    "swim",
    "cycling",
  ];

  const accessories = [
    "bag",
    "bags",
    "cap",
    "caps",
    "hat",
    "hats",
    "glove",
    "gloves",
    "watch",
    "belt",
    "backpack",
    "water bottle",
    "bottle",
    "accessor",
  ];

  if (shoes.some((k) => s.includes(k))) return "shoes";
  if (clothing.some((k) => s.includes(k))) return "clothing";
  if (sport.some((k) => s.includes(k))) return "sport";
  if (accessories.some((k) => s.includes(k))) return "accessories";
  return "more";
};

const makeColumn = (key, title, links) => ({
  key,
  title,
  links: (links || []).filter(Boolean),
});

const getHomeIntelligence = async (req, res) => {
  try {
    const sixHoursAgo = new Date(Date.now() - SIX_HOURS_MS);

    // 1) Total retailers (distinct stores in DB)
    const retailersTotal = await Product.distinct("store");

    // 2) Active retailers = ANY product seen in last 6h (ignore status / inStock)
    const retailersActive = await Product.distinct("store", {
      lastSeenAt: { $gte: sixHoursAgo },
    });

    // 3) Assets tracked
    const assetsTracked = await Product.countDocuments();

    // 4) Last global scan time (freshest product)
    const latestSeen = await Product.findOne(
      { lastSeenAt: { $ne: null } },
      { lastSeenAt: 1 },
    )
      .sort({ lastSeenAt: -1 })
      .lean();

    const lastScanSecondsAgo = latestSeen?.lastSeenAt
      ? Math.floor((Date.now() - new Date(latestSeen.lastSeenAt)) / 1000)
      : null;

    // 5) Snapshot data
    const [topDrop, biggestVolatility] = await Promise.all([
      Product.findOne(
        { discountPercent: { $gt: 0 } },
        { title: 1, discountPercent: 1, image: 1, store: 1, storeName: 1 },
      )
        .sort({ discountPercent: -1, createdAt: -1 })
        .lean(),

      Product.findOne(
        { discountPercent: { $gt: 0 } },
        { title: 1, discountPercent: 1, image: 1, store: 1, storeName: 1 },
      )
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    // placeholder until search analytics exists
    const mostSearchedBrand = "Stussy";

    // ----------------------------
    // SECTIONS (PriceSpy-style)
    // ----------------------------
    const limit = Math.min(24, Math.max(6, Number(req.query.limit) || 12));

    const [
      biggestDropsDocs,
      under20Docs,
      newlyDetectedDocs,
      menDocs,
      womenDocs,
    ] = await Promise.all([
      Product.find({ discountPercent: { $gt: 0 } })
        .sort({ discountPercent: -1, createdAt: -1 })
        .limit(limit)
        .select(
          "_id title store storeName price currency originalPrice discountPercent image",
        )
        .lean(),

      Product.find({ price: { $lte: 20 } })
        .sort({ discountPercent: -1, createdAt: -1 })
        .limit(limit)
        .select(
          "_id title store storeName price currency originalPrice discountPercent image",
        )
        .lean(),

      Product.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(
          "_id title store storeName price currency originalPrice discountPercent image",
        )
        .lean(),

      Product.find({ gender: "men" })
        .sort({ discountPercent: -1, createdAt: -1 })
        .limit(limit)
        .select(
          "_id title store storeName price currency originalPrice discountPercent image",
        )
        .lean(),

      Product.find({ gender: "women" })
        .sort({ discountPercent: -1, createdAt: -1 })
        .limit(limit)
        .select(
          "_id title store storeName price currency originalPrice discountPercent image",
        )
        .lean(),
    ]);

    const sections = [
      {
        id: "biggest-drops",
        title: "Biggest drops",
        subtitle: "Highest verified discounts right now.",
        seeAllUrl: "/products?sort=discount-desc",
        items: biggestDropsDocs.map(pickCardFields),
      },
      {
        id: "under-20",
        title: "Under £20",
        subtitle: "Low price, high value.",
        seeAllUrl: "/products?maxPrice=20&sort=discount-desc",
        items: under20Docs.map(pickCardFields),
      },
      {
        id: "newly-detected",
        title: "Newly detected",
        subtitle: "Fresh items added to the feed.",
        seeAllUrl: "/products?sort=newest",
        items: newlyDetectedDocs.map(pickCardFields),
      },
      {
        id: "men",
        title: "Men",
        subtitle: "Top value for men right now.",
        seeAllUrl: "/products?gender=men&sort=discount-desc",
        items: menDocs.map(pickCardFields),
      },
      {
        id: "women",
        title: "Women",
        subtitle: "Top value for women right now.",
        seeAllUrl: "/products?gender=women&sort=discount-desc",
        items: womenDocs.map(pickCardFields),
      },
    ].filter((s) => (s.items || []).length > 0);

    return res.json({
      system: {
        retailersOnline: retailersActive.length,
        retailersTotal: retailersTotal.length,
        assetsTracked,
        lastScanSecondsAgo,
      },
      snapshot: {
        topDrop,
        biggestVolatility,
        mostSearchedBrand,
      },
      sections,
    });
  } catch (err) {
    console.error("Home intelligence error:", err);
    return res.status(500).json({
      message: "Failed to load home intelligence",
    });
  }
};

// ✅ header/home nav config for dynamic routes (now includes Nike-style megaMenu)
const getNav = async (req, res) => {
  try {
    const quickLinks = [
      {
        key: "biggest-drops",
        label: "Biggest Drops",
        to: "/products?sort=discount-desc&page=1",
      },
      {
        key: "under-20",
        label: "Under £20",
        to: "/products?maxPrice=20&page=1",
      },
      {
        key: "newly-detected",
        label: "Newly detected",
        to: "/products?sort=newest&page=1",
      },
      {
        key: "browse-all",
        label: "Browse all",
        to: "/products?page=1",
      },
    ];

    // genders from data
    const rawGenders = await Product.distinct("gender");
    const genders = uniqNonEmpty(rawGenders)
      .map((g) => String(g).trim().toLowerCase())
      .filter(Boolean)
      .map((g) => ({
        key: toSlug(g),
        label: cap(g),
        value: g,
        to: `/products?gender=${encodeURIComponent(g)}&page=1`,
      }));

    // top categories per gender (top 8 each)
    const catsAgg = await Product.aggregate([
      {
        $project: {
          genderLabel: {
            $toLower: { $trim: { input: { $ifNull: ["$gender", ""] } } },
          },
          categoryLabel: {
            $toLower: { $trim: { input: { $ifNull: ["$category", ""] } } },
          },
        },
      },
      { $match: { genderLabel: { $ne: "" }, categoryLabel: { $ne: "" } } },
      {
        $group: {
          _id: { gender: "$genderLabel", category: "$categoryLabel" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      {
        $group: {
          _id: "$_id.gender",
          categories: { $push: { name: "$_id.category", count: "$count" } },
        },
      },
      {
        $project: {
          _id: 0,
          gender: "$_id",
          categories: { $slice: ["$categories", 8] },
        },
      },
      { $sort: { gender: 1 } },
    ]);

    const topCategoriesByGender = {};
    catsAgg.forEach((row) => {
      topCategoriesByGender[row.gender] = row.categories.map((c) => ({
        key: toSlug(c.name),
        label: cap(c.name),
        value: c.name,
        to: `/products?gender=${encodeURIComponent(row.gender)}&category=${encodeURIComponent(
          c.name,
        )}&page=1`,
      }));
    });

    // top stores overall (top 10)
    const storesAgg = await Product.aggregate([
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
      { $limit: 10 },
    ]);

    const topStores = storesAgg.map((s) => ({
      key: toSlug(s._id),
      label: s.label,
      value: s._id,
      to: `/products?store=${encodeURIComponent(s._id)}&page=1`,
    }));

    // ----------------------------
    // Nike-style mega menu data
    // ----------------------------
    const megaMenu = {
      tabs: [
        {
          key: "new",
          label: "New",
          value: "new",
          to: "/products?sort=newest&page=1",
        },
        ...genders.map((g) => ({
          key: g.key,
          label: g.label,
          value: g.value,
          to: g.to,
        })),
        {
          key: "sport",
          label: "Sport",
          value: "sport",
          to: "/products?page=1",
        },
      ],
      panels: {},
    };

    // New panel (global)
    megaMenu.panels.new = {
      key: "new",
      label: "New",
      to: "/products?sort=newest&page=1",
      columns: [
        makeColumn(
          "highlights",
          "Highlights",
          quickLinks.map((l) => ({
            key: l.key,
            label: l.label,
            to: l.to,
          })),
        ),
        makeColumn(
          "brands",
          "Brands",
          topStores.slice(0, 6).map((s) => ({
            key: s.key,
            label: s.label,
            to: s.to,
          })),
        ),
      ].filter((c) => (c.links || []).length > 0),
    };

    // Gender panels
    const genderValues = genders.map((g) => g.value);
    genderValues.forEach((g) => {
      const cats = topCategoriesByGender[g] || [];

      const shoesLinks = [];
      const clothingLinks = [];
      const sportLinks = [];
      const accessoriesLinks = [];
      const moreLinks = [];

      cats.forEach((c) => {
        const bucket = classifyCategoryBucket(c.value);
        const entry = {
          key: c.key,
          label: c.label,
          to: c.to,
        };

        if (bucket === "shoes") shoesLinks.push(entry);
        else if (bucket === "clothing") clothingLinks.push(entry);
        else if (bucket === "sport") sportLinks.push(entry);
        else if (bucket === "accessories") accessoriesLinks.push(entry);
        else moreLinks.push(entry);
      });

      const featured = [
        ...quickLinks.map((l) => ({
          key: l.key,
          label: l.label,
          to: withGender(l.to, g),
        })),
        {
          key: "view-all",
          label: "View all",
          to: `/products?gender=${encodeURIComponent(g)}&page=1`,
        },
      ];

      megaMenu.panels[g] = {
        key: toSlug(g),
        label: cap(g),
        to: `/products?gender=${encodeURIComponent(g)}&page=1`,
        columns: [
          makeColumn("highlights", "Highlights", featured),
          makeColumn("shoes", "Shoes", shoesLinks),
          makeColumn("clothing", "Clothing", clothingLinks),
          makeColumn("sport", "Sport", sportLinks),
          makeColumn(
            "brands",
            "Brands",
            topStores.slice(0, 6).map((s) => ({
              key: s.key,
              label: s.label,
              to: s.to,
            })),
          ),
          makeColumn("accessories", "Accessories", accessoriesLinks),
          makeColumn("more", "More", moreLinks),
        ].filter((c) => (c.links || []).length > 0),
      };
    });

    // Sport panel (global + best-effort from all categories)
    const allCats = Object.values(topCategoriesByGender || {})
      .flat()
      .map((c) => ({ key: c.key, label: c.label, value: c.value, to: c.to }));

    const sportOnly = allCats
      .filter((c) => classifyCategoryBucket(c.value) === "sport")
      .slice(0, 10)
      .map((c) => ({ key: c.key, label: c.label, to: c.to }));

    megaMenu.panels.sport = {
      key: "sport",
      label: "Sport",
      to: "/products?page=1",
      columns: [
        makeColumn(
          "highlights",
          "Highlights",
          [
            { key: "trending", label: "Trending", to: "/products?page=1" },
            {
              key: "biggest-drops",
              label: "Biggest Drops",
              to: "/products?sort=discount-desc&page=1",
            },
            {
              key: "new",
              label: "Newly detected",
              to: "/products?sort=newest&page=1",
            },
          ].filter(Boolean),
        ),
        makeColumn("sport", "Sport", sportOnly),
        makeColumn(
          "brands",
          "Brands",
          topStores.slice(0, 8).map((s) => ({
            key: s.key,
            label: s.label,
            to: s.to,
          })),
        ),
      ].filter((c) => (c.links || []).length > 0),
    };

    res.json({
      quickLinks,
      genders,
      topCategoriesByGender,
      topStores,
      megaMenu,
    });
  } catch (err) {
    console.error("Home nav error:", err);
    return res.status(500).json({ message: "Failed to load nav" });
  }
};

module.exports = {
  getHomeIntelligence,
  getNav,
};
