const Product = require("../models/product.model");

const escapeRegex = (s = "") =>
  String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const makeExactRegex = (s = "") => new RegExp(`^${escapeRegex(s)}$`, "i");
const makeContainsRegex = (s = "") => new RegExp(escapeRegex(s), "i");

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

/**
 * Canonical category aliases
 * - keeps your DB unchanged
 * - makes category=trainers include nike categories too
 */
const CATEGORY_ALIASES = {
  trainers: ["trainers", "running-shoes", "lifestyle-shoes"],
  // add more later if needed:
  // joggers: ["joggers", "jog-track-pants"],
};

const buildCategoryMatch = (categoryRaw) => {
  const c = String(categoryRaw || "")
    .trim()
    .toLowerCase();
  if (!c) return null;

  const aliases = CATEGORY_ALIASES[c] || [c];

  // exact match across aliases (case-insensitive)
  // NOTE: your DB stores slugs like "running-shoes", "trainers"
  return {
    $or: aliases.map((val) => ({ category: makeExactRegex(val) })),
  };
};

const getStores = async (req, res) => {
  try {
    const { category, search, gender } = req.query;

    const and = [];

    // ✅ gender is part of BASE QUERY (you locked this behavior)
    if (gender) {
      const g = String(gender).trim().toLowerCase();
      if (g) and.push({ gender: makeExactRegex(g) });
    }

    // ✅ category base query (canonical aliases)
    const categoryMatch = buildCategoryMatch(category);
    if (categoryMatch) and.push(categoryMatch);

    // ✅ optional search also part of base query
    const searchOr = buildSearchOr(search);
    if (searchOr) and.push(searchOr);

    const match = and.length ? { $and: and } : {};

    const rows = await Product.aggregate([
      { $match: match },

      // normalize grouping key + label
      {
        $project: {
          value: {
            $toLower: {
              $trim: { input: { $ifNull: ["$store", ""] } },
            },
          },
          label: {
            $trim: { input: { $ifNull: ["$storeName", "$store"] } },
          },
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

// ✅ UPDATED: supports ?gender=men (and keeps ?store=... working). Can use both.
const getCategories = async (req, res) => {
  try {
    const { store, gender } = req.query;

    const and = [];

    // optional store filter (exact, case-insensitive)
    if (store) {
      const s = String(store).trim();
      if (s) {
        const sRe = makeExactRegex(s);
        and.push({ $or: [{ store: sRe }, { storeName: sRe }] });
      }
    }

    // optional gender filter (exact, case-insensitive)
    if (gender) {
      const g = String(gender).trim().toLowerCase();
      if (g) {
        const gRe = makeExactRegex(g);
        and.push({ gender: gRe });
      }
    }

    const match = and.length ? { $and: and } : {};

    const rows = await Product.aggregate([
      { $match: match },
      {
        $project: {
          categoryLabel: {
            $toLower: {
              $trim: { input: { $ifNull: ["$category", ""] } },
            },
          },
        },
      },
      { $match: { categoryLabel: { $ne: "" } } },
      { $group: { _id: "$categoryLabel" } },
      { $sort: { _id: 1 } },
    ]);

    res.json({ categories: rows.map((r) => r._id) });
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
};

const getProducts = async (req, res) => {
  try {
    const {
      search,
      store,
      category,
      gender,
      minPrice,
      maxPrice,
      inStock,
      status,
      page = 1,
      limit = 50,
      sort = "newest", // newest | oldest | price-asc | price-desc | discount-desc | store-asc | store-desc
    } = req.query;

    const and = [];

    if (status) and.push({ status });

    // ✅ gender filter (exact, case-insensitive)
    if (gender) {
      const g = String(gender).trim().toLowerCase();
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

    // store filter (exact, case-insensitive)
    if (store) {
      const s = String(store).trim();
      if (s) {
        const sRe = makeExactRegex(s);
        and.push({ $or: [{ store: sRe }, { storeName: sRe }] });
      }
    }

    // ✅ category filter (canonical aliases)
    const categoryMatch = buildCategoryMatch(category);
    if (categoryMatch) and.push(categoryMatch);

    const searchOr = buildSearchOr(search);
    if (searchOr) and.push(searchOr);

    const query = and.length ? { $and: and } : {};

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    let sortObj = { createdAt: -1 };
    if (sort === "oldest") sortObj = { createdAt: 1 };
    if (sort === "price-asc") sortObj = { price: 1 };
    if (sort === "price-desc") sortObj = { price: -1 };
    if (sort === "discount-desc")
      sortObj = { discountPercent: -1, createdAt: -1 };
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
