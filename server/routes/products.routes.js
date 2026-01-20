const express = require("express");
const requireClerkAuth = require("../middleware/requireClerkAuth");
const Save = require("../models/save.product.model");

const {
  getStores,
  getCategories,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/products.controller");

const router = express.Router();

router.get("/stores", getStores);
router.get("/categories", getCategories);

router.get("/", getProducts);
router.post("/", createProduct);

router.post("/save", requireClerkAuth, async (req, res) => {
  try {
    const { id: productId } = req.body;
    if (!productId)
      return res.status(400).json({ message: "product id is required" });

    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const savedProduct = await Save.create({ clerkId, productId });

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

    const products = await Save.find({ clerkId }).populate("productId");
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/saved-item/:id", requireClerkAuth, async (req, res) => {
  try {
    const clerkId = req.userId;

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

router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
