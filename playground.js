const { runBoohooCrawl } = require("./server/scrappers/boohoo.scraper");

const run = async () => {
  const products = await runBoohooCrawl({
    startUrls: [
      {
        url: "https://www.boohooman.com/mens/hoodies-sweatshirts",
        userData: { gender: "men", category: "hoodies & sweatshirts" },
      },
    ],
    maxListPages: 1,
    debug: true,
  });

  console.log("BOOHOO PRODUCTS:", products.length);
};

run().catch(console.error);
