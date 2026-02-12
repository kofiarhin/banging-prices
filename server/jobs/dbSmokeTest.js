require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("../models/product.model");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const total = await Product.countDocuments();
  const stores = await Product.distinct("store");
  const latest = await Product.findOne()
    .sort({ lastSeenAt: -1 })
    .select("lastSeenAt store title")
    .lean();

  console.log({
    total,
    storesCount: stores.length,
    stores: stores.slice(0, 25),
    latest,
  });

  await mongoose.connection.close();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
