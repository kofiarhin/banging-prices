const express = require("express");
const requireClerkAuth = require("../middleware/requireClerkAuth");
const Save = require("../models/save.product.model");
const User = require("../models/user.model");

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
router.post("/save", requireClerkAuth, async (req, res, next) => {
  try {
    const { id: productId } = req.body;
    if (!productId) {
      throw new Error("product id is required");
    }
    const clerkId = req.auth.userId;
    const user = await User.findOne({ clerkId });
    //save product
    const savedProduct = await Save.create({ userId: user?._id, productId });
    return res.json({ message: "save product" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
});

router.get("/saved", requireClerkAuth, async (req, res, next) => {
  const clerkId = req.auth.userId;

  const { _id: userId } = await User.findOne({ clerkId });

  //find all saved products where user id is _id;
  const products = await Save.find({ userId }).populate("productId");
  return res.json(products);
});

router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
