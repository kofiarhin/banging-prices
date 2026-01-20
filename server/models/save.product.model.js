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
  },
  { timestamps: true },
);

saveProductSchema.index({ clerkId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("Save", saveProductSchema);
