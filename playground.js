// playground.js
require("dotenv").config();

const {
  runRiverIslandCrawl,
} = require("./server/scrappers/riverisland.scraper");

const run = async () => {
  const products = await runRiverIslandCrawl({
    startUrls: [
      // ---------------- WOMEN ----------------
      {
        url: "https://www.riverisland.com/c/women/tops?f-cat=hoodies&f-cat=sweatshirts",
        userData: { gender: "women", category: "hoodies-sweatshirts" },
      },
      {
        url: "https://www.riverisland.com/c/women/coats-and-jackets",
        userData: { gender: "women", category: "coats-jackets" },
      },
      {
        url: "https://www.riverisland.com/c/women/jeans",
        userData: { gender: "women", category: "jeans" },
      },
      {
        url: "https://www.riverisland.com/c/women/shoes-and-boots?f-cat=shoes",
        userData: { gender: "women", category: "shoes" },
      },
      {
        url: "https://www.riverisland.com/c/women/shoes-and-boots?f-cat=trainers",
        userData: { gender: "women", category: "trainers" },
      },

      // ---------------- MEN ----------------
      {
        url: "https://www.riverisland.com/c/men/hoodies-and-sweatshirts",
        userData: { gender: "men", category: "hoodies-sweatshirts" },
      },
      {
        url: "https://www.riverisland.com/c/men/coats-and-jackets",
        userData: { gender: "men", category: "coats-jackets" },
      },
      {
        url: "https://www.riverisland.com/c/men/jeans",
        userData: { gender: "men", category: "jeans" },
      },
      {
        url: "https://www.riverisland.com/c/men/shoes-and-boots?f-cat=shoes",
        userData: { gender: "men", category: "shoes" },
      },
      {
        url: "https://www.riverisland.com/c/men/shoes-and-boots?f-cat=trainers",
        userData: { gender: "men", category: "trainers" },
      },

      // ---------------- KIDS ----------------
      {
        url: "https://www.riverisland.com/c/kids/kids-hoodies-and-sweatshirts",
        userData: { gender: "kids", category: "hoodies-sweatshirts" },
      },
      {
        url: "https://www.riverisland.com/c/kids/kids-coats-and-jackets",
        userData: { gender: "kids", category: "coats-jackets" },
      },
      {
        url: "https://www.riverisland.com/c/kids/kids-jeans",
        userData: { gender: "kids", category: "jeans" },
      },
      {
        url: "https://www.riverisland.com/c/girls/footwear?f-cat=trainers",
        userData: { gender: "kids", category: "trainers" },
      },
      {
        url: "https://www.riverisland.com/c/boys/footwear?f-cat=trainers",
        userData: { gender: "kids", category: "trainers" },
      },
      {
        url: "https://www.riverisland.com/c/girls/footwear?f-cat=boots",
        userData: { gender: "kids", category: "boots" },
      },
      {
        url: "https://www.riverisland.com/c/boys/boots",
        userData: { gender: "kids", category: "boots" },
      },
    ],
    maxListPages: 1,
    debug: true,
  });

  console.log("✅ River Island products:", products.length);
  console.log(products.slice(0, 3));
};

run().catch(console.error);
