// server/controllers/alerts.controller.js
const PriceDropAlert = require("../models/priceDropAlert.model");

const getPriceDrops = async (req, res) => {
  try {
    const hours = Number(req.query.hours || 24);
    const store = req.query.store || null;

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const query = { detectedAt: { $gte: since } };
    if (store) query.store = store;

    const drops = await PriceDropAlert.find(query)
      .sort({ detectedAt: -1 })
      .lean();

    res.json({
      hours,
      store: store || "all",
      total: drops.length,
      drops,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch drops", details: err.message });
  }
};

module.exports = { getPriceDrops };
