const express = require("express");
const requireClerkAuth = require("../middleware/requireClerkAuth");
const PriceAlert = require("../models/priceAlert.model");
const Product = require("../models/product.model");

const router = express.Router();

// GET /api/alerts
router.get("/", requireClerkAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const alerts = await PriceAlert.find({ clerkId })
      .populate("productId")
      .sort({ createdAt: -1 });

    return res.json(alerts);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/alerts
router.post("/", requireClerkAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const { productId, type, targetPrice, targetPercent } = req.body;

    if (!productId)
      return res.status(400).json({ message: "productId is required" });
    if (!["price", "percent", "stock"].includes(type))
      return res.status(400).json({ message: "Invalid type" });

    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    const payload = {
      clerkId,
      productId,
      type,
      currency: product.currency || "GBP",
      isActive: true,
      triggeredAt: null,
      lastNotifiedAt: null,
    };

    if (type === "price") {
      const n = Number(targetPrice);
      if (!Number.isFinite(n))
        return res
          .status(400)
          .json({ message: "targetPrice must be a number" });
      payload.targetPrice = n;
    }

    if (type === "percent") {
      const n = Number(targetPercent);
      if (!Number.isFinite(n) || n <= 0)
        return res.status(400).json({ message: "targetPercent must be > 0" });
      payload.targetPercent = n;
      payload.baselinePrice = Number(product.price);
    }

    if (type === "stock") {
      // nothing else required
    }

    // upsert: if exists, update it (reactivate + new target)
    const alert = await PriceAlert.findOneAndUpdate(
      { clerkId, productId, type },
      { $set: payload },
      { upsert: true, new: true },
    ).populate("productId");

    return res.json({ message: "tracker active", alert });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "Already tracking" });
    return res.status(500).json({ message: err.message });
  }
});

// DELETE /api/alerts/:id
router.delete("/:id", requireClerkAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const deleted = await PriceAlert.findOneAndDelete({
      _id: req.params.id,
      clerkId,
    });
    if (!deleted) return res.status(404).json({ message: "Alert not found" });

    return res.json({ message: "deleted", id: deleted._id });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
