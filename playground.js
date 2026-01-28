// playground.js
require("dotenv").config();

const {
  runMarksAndSpencerCrawl,
} = require("./server/scrappers/marksandspencer.scraper");

const run = async () => {
  const products = await runMarksAndSpencerCrawl({
    startUrls: [
      {
        url: "https://www.marksandspencer.com/l/women/jeans",
        userData: { gender: "women", category: "jeans" },
      },
    ],
    maxListPages: 1,
    debug: true,
  });

  console.log("✅ M&S products:", products.length);
  console.log(products.slice(0, 3));
};

run().catch(console.error);
