const express = require("express");
const requireClerkAuth = require("../middleware/requireClerkAuth");
const Save = require("../models/save.product.model");
const Collection = require("../models/collection.model");

const {
  getStores,
  getCategories,
  getProducts,
  getProductById,
  getProductHistory,
  getStoreInsights,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/products.controller");

const router = express.Router();

// ✅ filters + counts supported via query (gender/category/search/etc)
router.get("/stores/insights", getStoreInsights);
router.get("/stores", getStores);

// ✅ supports query (store/gender/search/min/max/etc) and returns available categories
router.get("/categories", getCategories);

router.get("/", getProducts);
router.post("/", createProduct);

router.post("/save", requireClerkAuth, async (req, res) => {
  try {
    const { id: productId, collectionId } = req.body;
    if (!productId)
      return res.status(400).json({ message: "product id is required" });

    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    let collection = null;
    if (collectionId) {
      collection = await Collection.findOne({
        _id: collectionId,
        clerkId,
      });
      if (!collection)
        return res.status(404).json({ message: "Collection not found" });
    }

    const savedProduct = await Save.create({
      clerkId,
      productId,
      collectionId: collection?._id || null,
    });

    return res.json({ message: "saved", savedProduct });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Already saved" });
    }
    return res.status(500).json({ message: error.message });
  }
});

router.get("/saved", requireClerkAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const products = await Save.find({ clerkId })
      .populate("productId")
      .populate("collectionId")
      .sort({ createdAt: -1 });
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/saved-item/:id", requireClerkAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const { collectionId } = req.body;
    const saveId = req.params.id;
    if (!saveId)
      return res.status(400).json({ message: "saved item id is required" });

    let collection = null;
    if (collectionId) {
      collection = await Collection.findOne({
        _id: collectionId,
        clerkId,
      });
      if (!collection)
        return res.status(404).json({ message: "Collection not found" });
    }

    const updated = await Save.findOneAndUpdate(
      { _id: saveId, clerkId },
      { $set: { collectionId: collection?._id || null } },
      { new: true },
    )
      .populate("productId")
      .populate("collectionId");

    if (!updated)
      return res.status(404).json({ message: "Saved item not found" });

    return res.json({ message: "updated", savedItem: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Already saved in collection" });
    }
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/saved-item/:id", requireClerkAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const productId = req.params.id;
    if (!productId)
      return res.status(400).json({ message: "product id is required" });

    const deleted = await Save.findOneAndDelete({ clerkId, productId });

    if (!deleted)
      return res.status(404).json({ message: "Saved item not found" });

    return res.json({ message: "deleted", deletedId: deleted._id, productId });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:id/history", getProductHistory);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
