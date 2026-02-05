// server/models/product.model.js
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    canonicalKey: { type: String, required: true, unique: true, index: true },
    store: { type: String, required: true },
    storeName: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, required: true },
    originalPrice: { type: Number, default: null },
    discountPercent: { type: Number, default: null },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    productUrl: { type: String, required: true },
    saleUrl: { type: String, default: null },
    category: { type: String, default: null },
    gender: { type: String, default: null },
    colors: { type: [String], default: [] },
    sizesRaw: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    inStock: { type: Boolean, default: true },
    status: { type: String, default: "active" },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ProductSchema.index({ store: 1, createdAt: -1 });
ProductSchema.index({ storeName: 1 });
ProductSchema.index({ category: 1, gender: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ discountPercent: -1 });
ProductSchema.index({ status: 1, inStock: 1, lastSeenAt: -1 });
ProductSchema.index({ gender: 1, category: 1, price: 1, createdAt: -1 });

module.exports = mongoose.model("Product", ProductSchema);
