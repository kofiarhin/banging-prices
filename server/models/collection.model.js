const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    shareId: { type: String, required: true, unique: true, index: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

collectionSchema.index({ clerkId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Collection", collectionSchema);
