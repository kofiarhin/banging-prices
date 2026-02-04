const mongoose = require("mongoose");

const saveProductSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

saveProductSchema.index(
  { clerkId: 1, productId: 1, collectionId: 1 },
  { unique: true },
);

module.exports = mongoose.model("Save", saveProductSchema);
