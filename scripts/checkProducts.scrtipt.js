// playground.js
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../server/models/product.model");

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const stores = await Product.distinct("store");
    console.log(stores); // ["asos","boohoo","riverisland",...]

    // optional: with counts per store
    const breakdown = await Product.aggregate([
      { $group: { _id: "$store", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, store: "$_id", count: 1 } },
    ]);
    console.log(breakdown);
  } catch (error) {
    console.log(error.message);
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
};

run();
