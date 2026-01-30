require("dotenv").config();
const { runJdSportsCrawl } = require("./server/scrappers/jdsports.scraper");

const run = async () => {
  const startUrls = [
    {
      url: "https://www.jdsports.co.uk/women/womens-footwear/trainers/",
      userData: { gender: "women", category: "trainers" },
    },
  ];

  const products = await runJdSportsCrawl({
    startUrls,
    maxListPages: 1, // bump this up to crawl more pages
    maxProducts: 10, // 0 = no cap
    debug: true,
  });

  console.log("✅ JD products:", products.length);
  console.log(products.slice(0, 2));
};

run().catch((e) => {
  console.error("❌ JD crawl failed:", e);
  process.exit(1);
});
