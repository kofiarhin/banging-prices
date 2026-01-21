const mongoose = require("mongoose");

const priceAlertSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, index: true },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["price", "percent", "stock"],
      required: true,
      index: true,
    },

    currency: { type: String, default: "GBP" },

    // price alert
    targetPrice: { type: Number, default: null },

    // percent alert
    targetPercent: { type: Number, default: null },
    baselinePrice: { type: Number, default: null }, // price at time of activation

    // lifecycle
    isActive: { type: Boolean, default: true, index: true },
    triggeredAt: { type: Date, default: null },
    lastNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// prevent duplicates (same user tracking same thing on same product)
priceAlertSchema.index({ clerkId: 1, productId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("PriceAlert", priceAlertSchema);
