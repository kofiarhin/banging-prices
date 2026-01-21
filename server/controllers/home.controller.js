const Product = require("../models/product.model");

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const getHomeIntelligence = async (req, res) => {
  try {
    const sixHoursAgo = new Date(Date.now() - SIX_HOURS_MS);

    // 1️⃣ Total retailers (distinct stores in DB)
    const retailersTotal = await Product.distinct("store");

    // 2️⃣ Active retailers = ANY product seen in last 6h
    // ✅ FIX: ignore status / inStock
    const retailersActive = await Product.distinct("store", {
      lastSeenAt: { $gte: sixHoursAgo },
    });

    // 3️⃣ Assets tracked
    const assetsTracked = await Product.countDocuments();

    // 4️⃣ Last global scan time (freshest product)
    const latestSeen = await Product.findOne(
      { lastSeenAt: { $ne: null } },
      { lastSeenAt: 1 },
    )
      .sort({ lastSeenAt: -1 })
      .lean();

    const lastScanSecondsAgo = latestSeen?.lastSeenAt
      ? Math.floor((Date.now() - new Date(latestSeen.lastSeenAt)) / 1000)
      : null;

    // 5️⃣ Snapshot data
    const [topDrop, biggestVolatility] = await Promise.all([
      Product.findOne(
        { discountPercent: { $gt: 0 } },
        {
          title: 1,
          discountPercent: 1,
          image: 1,
          store: 1,
        },
      )
        .sort({ discountPercent: -1 })
        .lean(),

      Product.findOne(
        { discountPercent: { $gt: 0 } },
        {
          title: 1,
          discountPercent: 1,
          image: 1,
          store: 1,
        },
      )
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    // ⚠️ placeholder until search analytics exists
    const mostSearchedBrand = "Stussy";

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
    });
  } catch (err) {
    console.error("Home intelligence error:", err);
    return res.status(500).json({
      message: "Failed to load home intelligence",
    });
  }
};

module.exports = {
  getHomeIntelligence,
};
