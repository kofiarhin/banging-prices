/* server/scripts/migrateProducts.js */
const mongoose = require("mongoose");

const { MONGO_URI, MONGO_URI_DEV, BATCH_SIZE = "500" } = process.env;

if (!MONGO_URI || !MONGO_URI_DEV) {
  console.error("Missing MONGO_URI (prod) or MONGO_URI_DEV (dev) in .env");
  process.exit(1);
}

const batchSize = Number(BATCH_SIZE) || 500;

const connect = async (uri) =>
  mongoose.createConnection(uri, { maxPoolSize: 10 });

const run = async () => {
  // ✅ SOURCE (dev) -> ✅ DESTINATION (prod)
  const devConn = await connect(MONGO_URI_DEV);
  const prodConn = await connect(MONGO_URI);

  console.log(`Dev DB: ${devConn.name}`);
  console.log(`Prod DB: ${prodConn.name}`);

  const COLLECTION = "products";
  const devCol = devConn.db.collection(COLLECTION);
  const prodCol = prodConn.db.collection(COLLECTION);

  const total = await devCol.countDocuments({});
  console.log(`Dev ${COLLECTION}: ${total}`);

  const cursor = devCol.find({});
  let ops = [];
  let processed = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();

    if (!doc || !doc._id) continue;

    // remove mongoose-ish field if it exists
    if (doc && typeof doc === "object") delete doc.__v;

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: doc },
        upsert: true,
      },
    });

    if (ops.length >= batchSize) {
      const res = await prodCol.bulkWrite(ops, { ordered: false });
      processed += ops.length;

      console.log(
        `Batch ${ops.length} | processed ${processed}/${total} | upserts ${res.upsertedCount} | modified ${res.modifiedCount}`,
      );

      ops = [];
    }
  }

  if (ops.length) {
    const res = await prodCol.bulkWrite(ops, { ordered: false });
    processed += ops.length;

    console.log(
      `Final ${ops.length} | processed ${processed}/${total} | upserts ${res.upsertedCount} | modified ${res.modifiedCount}`,
    );
  }

  await devConn.close();
  await prodConn.close();
  console.log("Done ✅");
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
