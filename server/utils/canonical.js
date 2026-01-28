const crypto = require("crypto");

const normalizeUrl = (rawUrl) => {
  try {
    const u = new URL(rawUrl);
    u.hash = "";
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "affid",
      "cmp",
      "kid",

      // M&S (don’t treat colour variants as separate products)
      "color",
      "intid",
      "intcmp",
    ].forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return rawUrl;
  }
};

const sha1 = (str) => crypto.createHash("sha1").update(str).digest("hex");

const makeCanonicalKey = ({ store, productUrl }) =>
  `${store}:${sha1(normalizeUrl(productUrl))}`;

module.exports = { normalizeUrl, makeCanonicalKey };
