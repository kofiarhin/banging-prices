const PriceAlert = require("../models/priceAlert.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");

// swap this later for SendGrid/Nodemailer
const sendAlert = async ({ to, subject, message }) => {
  // ✅ fallback: console notify (so feature works end-to-end)
  console.log("\n📣 ALERT EMAIL (mock)");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log(message);
};

const shouldTrigger = (alert, product) => {
  if (!alert?.isActive) return false;
  if (!product) return false;

  if (alert.type === "price") {
    const target = Number(alert.targetPrice);
    const now = Number(product.price);
    if (!Number.isFinite(target) || !Number.isFinite(now)) return false;
    return now <= target;
  }

  if (alert.type === "percent") {
    const base = Number(alert.baselinePrice);
    const now = Number(product.price);
    const targetPct = Number(alert.targetPercent);

    if (!Number.isFinite(base) || base <= 0) return false;
    if (!Number.isFinite(now)) return false;
    if (!Number.isFinite(targetPct) || targetPct <= 0) return false;

    const pct = ((base - now) / base) * 100;
    return pct >= targetPct;
  }

  if (alert.type === "stock") {
    return product.inStock === true;
  }

  return false;
};

const buildMessage = ({ alert, product }) => {
  const current = `${product.currency} ${Number(product.price).toFixed(2)}`;
  let target = "";

  if (alert.type === "price")
    target = `${alert.currency} ${Number(alert.targetPrice).toFixed(2)}`;
  if (alert.type === "percent") target = `${Number(alert.targetPercent)}% drop`;
  if (alert.type === "stock") target = "Back in stock";

  return {
    subject: `PricePulse: Tracker Triggered (${alert.type.toUpperCase()})`,
    message:
      `Product: ${product.title}\n` +
      `Store: ${product.storeName || product.store}\n` +
      `Current: ${current}\n` +
      `Target: ${target}\n` +
      `Link: ${product.productUrl}\n`,
  };
};

const processAlerts = async () => {
  const alerts = await PriceAlert.find({ isActive: true }).lean();
  if (!alerts.length) return { checked: 0, triggered: 0 };

  const productIds = alerts.map((a) => a.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  let triggered = 0;

  for (const alert of alerts) {
    const product = productMap.get(String(alert.productId));
    if (!product) continue;

    if (!shouldTrigger(alert, product)) continue;

    const user = await User.findOne({ clerkId: alert.clerkId }).lean();
    if (!user?.email) continue;

    const { subject, message } = buildMessage({ alert, product });
    await sendAlert({ to: user.email, subject, message });

    await PriceAlert.updateOne(
      { _id: alert._id },
      {
        $set: {
          isActive: false,
          triggeredAt: new Date(),
          lastNotifiedAt: new Date(),
        },
      },
    );

    triggered++;
  }

  return { checked: alerts.length, triggered };
};

module.exports = { processAlerts };
