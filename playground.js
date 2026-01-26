require("dotenv").config();

const { runNikeCrawl } = require("./server/scrappers/nike.scraper");

const run = async () => {
  try {
    const products = await runNikeCrawl({
      startUrls: [
        {
          url: "https://www.nike.com/gb/w/mens-jordan-shoes-37eefznik1zy7ok",
          userData: { gender: "men", category: "jordan-shoes" },
        },
      ],
      maxListPages: 2,
      debug: true,
    });

    console.log("✅ NIKE products:", products.length);
    console.log("🔎 sample:", products.slice(0, 3));
    process.exit(0);
  } catch (err) {
    console.error("❌ NIKE TEST FAILED:", err?.message || err);
    process.exit(1);
  }
};

run();
