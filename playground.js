// playground.js
require("dotenv").config();

const {
  runRiverIslandCrawl,
} = require("./server/scrappers/riverisland.scraper");

const run = async () => {
  const products = await runRiverIslandCrawl({
    startUrls: [
      {
        url: "https://www.riverisland.com/c/women/tops?f-cat=hoodies&f-cat=sweatshirts",
        userData: { gender: "women", category: "hoodies-sweatshirts" },
      },
    ],
    maxListPages: 1,
    debug: true,
  });

  console.log("✅ River Island products:", products.length);
  console.log(products.slice(0, 3));
};

run().catch(console.error);
