const express = require("express");
const crypto = require("crypto");
const requireClerkAuth = require("../middleware/requireClerkAuth");
const Collection = require("../models/collection.model");
const Save = require("../models/save.product.model");

const router = express.Router();

const createShareId = () => crypto.randomBytes(8).toString("hex");

// GET /api/collections (auth)
router.get("/", requireClerkAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const collections = await Collection.find({ clerkId }).sort({
      isDefault: -1,
      name: 1,
    });

    const counts = await Save.aggregate([
      { $match: { clerkId } },
      {
        $group: {
          _id: "$collectionId",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(
      counts.map((c) => [String(c._id || "null"), c.count]),
    );

    return res.json(
      collections.map((c) => ({
        _id: c._id,
        name: c.name,
        shareId: c.shareId,
        isDefault: c.isDefault,
        count: countMap.get(String(c._id)) || 0,
      })),
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/collections (auth)
router.post("/", requireClerkAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Name is required" });

    const existing = await Collection.findOne({
      clerkId,
      name: new RegExp(`^${name}$`, "i"),
    });
    if (existing)
      return res.status(409).json({ message: "Collection already exists" });

    const created = await Collection.create({
      clerkId,
      name,
      shareId: createShareId(),
      isDefault: false,
    });

    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// GET /api/collections/:shareId (public)
router.get("/:shareId", async (req, res) => {
  try {
    const shareId = String(req.params.shareId || "").trim();
    if (!shareId) return res.status(400).json({ message: "shareId required" });

    const collection = await Collection.findOne({ shareId }).lean();
    if (!collection)
      return res.status(404).json({ message: "Collection not found" });

    const saved = await Save.find({
      clerkId: collection.clerkId,
      collectionId: collection._id,
    })
      .populate("productId")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      collection: {
        name: collection.name,
        shareId: collection.shareId,
      },
      items: saved,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
