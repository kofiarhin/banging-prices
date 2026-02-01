const Product = require("../models/product.model");

const escapeRegex = (s = "") =>
  String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const makeExactRegex = (s = "") => new RegExp(`^${escapeRegex(s)}$`, "i");
const makeContainsRegex = (s = "") => new RegExp(escapeRegex(s), "i");

const normalizeSlug = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();

// ✅ category aliasing (expand anytime you discover new variants)
const CATEGORY_ALIASES = {
  "coats-and-jackets": ["coats-and-jackets", "coats-jackets", "jackets-coats"],
  "coats-jackets": ["coats-jackets", "coats-and-jackets", "jackets-coats"],
  "jackets-coats": ["jackets-coats", "coats-jackets", "coats-and-jackets"],

  "hoodies-and-sweatshirts": ["hoodies-and-sweatshirts", "hoodies-sweatshirts"],
  "hoodies-sweatshirts": ["hoodies-sweatshirts", "hoodies-and-sweatshirts"],

  "t-shirts": ["t-shirts", "t-shirts-vests"],
  "t-shirts-vests": ["t-shirts-vests", "t-shirts"],
};

const expandCategoryRegexes = (categoryRaw) => {
  const c = normalizeSlug(categoryRaw);
  if (!c) return [];
  const list = CATEGORY_ALIASES[c] || [c];
  return list.map((x) => makeContainsRegex(x));
};

const buildSearchOr = (qRaw) => {
  const q = String(qRaw || "").trim();
  if (!q) return null;

  const re = makeContainsRegex(q);

  return {
    $or: [
      { title: re },
      { storeName: re },
      { store: re },
      { category: re },
      { gender: re },
      { colors: { $in: [re] } },
    ],
  };
};

// ✅ shared filter builder for: products + stores + categories
const buildBaseMatch = (query) => {
  const {
    search,
    q,
    store,
    category,
    gender,
    minPrice,
    maxPrice,
    inStock,
    status,
  } = query || {};

  const and = [];

  if (status) {
    const st = String(status).trim();
    if (st) and.push({ status: makeExactRegex(st) });
  }

  if (gender) {
    const g = String(gender).trim();
    if (g) and.push({ gender: makeExactRegex(g) });
  }

  if (inStock === "true") and.push({ inStock: true });
  if (inStock === "false") and.push({ inStock: false });

  if (minPrice || maxPrice) {
    const price = {};
    if (minPrice) price.$gte = Number(minPrice);
    if (maxPrice) price.$lte = Number(maxPrice);
    and.push({ price });
  }

  if (store) {
    const s = String(store).trim();
    if (s) {
      const sRe = makeExactRegex(s);
      and.push({ $or: [{ store: sRe }, { storeName: sRe }] });
    }
  }

  if (category) {
    const regs = expandCategoryRegexes(category);
    if (regs.length) and.push({ $or: regs.map((r) => ({ category: r })) });
  }

  const searchOr = buildSearchOr(search || q);
  if (searchOr) and.push(searchOr);

  return and.length ? { $and: and } : {};
};

// ✅ stores endpoint now supports counts + respects existing filters (gender/category/search/etc.)
// Example: /api/products/stores?category=joggers&gender=men
const getStores = async (req, res) => {
  try {
    // IMPORTANT: ignore current store so dropdown shows all stores for current context
    const base = buildBaseMatch({ ...req.query, store: "" });

    const rows = await Product.aggregate([
      { $match: base },
      {
        $project: {
          value: { $ifNull: ["$store", ""] },
          label: { $trim: { input: { $ifNull: ["$storeName", "$store"] } } },
        },
      },
      { $match: { value: { $ne: "" }, label: { $ne: "" } } },
      {
        $group: {
          _id: "$value",
          label: { $first: "$label" },
          count: { $sum: 1 },
        },
      },
      { $sort: { label: 1 } },
    ]);

    res.json({
      stores: rows.map((r) => ({
        value: r._id,
        label: r.label,
        count: r.count,
      })),
    });
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
};

// ✅ categories endpoint now supports counts + respects existing filters (store/gender/search/min/max/etc.)
// Example: /api/products/categories?gender=men&store=nike
const getCategories = async (req, res) => {
  try {
    // ignore category so list is "available categories" for current context
    const match = buildBaseMatch({ ...req.query, category: "" });

    const rows = await Product.aggregate([
      { $match: match },
      {
        $project: {
          value: {
            $toLower: {
              $trim: { input: { $ifNull: ["$category", ""] } },
            },
          },
        },
      },
      { $match: { value: { $ne: "" } } },
      { $group: { _id: "$value", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      categories: rows.map((r) => ({ value: r._id, count: r.count })),
    });
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
};

const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50, sort = "newest" } = req.query;

    const query = buildBaseMatch(req.query);

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    // ✅ discount-desc with nulls last
    if (sort === "discount-desc") {
      const [rows, totalRow] = await Promise.all([
        Product.aggregate([
          { $match: query },
          {
            $addFields: {
              _discountSort: { $ifNull: ["$discountPercent", -1] },
            },
          },
          { $sort: { _discountSort: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },
          { $unset: "_discountSort" },
        ]),
        Product.aggregate([{ $match: query }, { $count: "total" }]),
      ]);

      const total = totalRow?.[0]?.total || 0;

      return res.json({
        items: rows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    }

    let sortObj = { createdAt: -1 };
    if (sort === "oldest") sortObj = { createdAt: 1 };
    if (sort === "price-asc") sortObj = { price: 1 };
    if (sort === "price-desc") sortObj = { price: -1 };
    if (sort === "store-asc")
      sortObj = { storeName: 1, store: 1, createdAt: -1 };
    if (sort === "store-desc")
      sortObj = { storeName: -1, store: -1, createdAt: -1 };

    const [items, total] = await Promise.all([
      Product.find(query).sort(sortObj).skip(skip).limit(limitNum),
      Product.countDocuments(query),
    ]);

    res.json({
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: "invalid product id" });
  }
};

const createProduct = async (req, res) => {
  try {
    const created = await Product.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Product already exists" });
    }
    res.status(400).json({ message: "something went wrong" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Product not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ ok: true, deletedId: deleted._id });
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
};

module.exports = {
  getStores,
  getCategories,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
