const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { clerkMiddleware } = require("@clerk/express");

const productsRoutes = require("./routes/products.routes");
const authRoutes = require("./routes/authRoutes");

// ✅ add
const alertsRoutes = require("./routes/alerts.routes");

const app = express();

// setup middlewares
app.use(clerkMiddleware());
app.use(cors());
app.use(express.json());

console.log("we on it");

// health (liveness)
app.get("/", (req, res) => {
  res.json({ ok: true, service: "api", time: new Date().toISOString() });
});

// health (readiness + db)
app.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = states[mongoose.connection.readyState] || "unknown";
  const ok = dbState === "connected";

  res.status(ok ? 200 : 503).json({
    ok,
    service: "api",
    db: dbState,
    uptime: Math.floor(process.uptime()),
    time: new Date().toISOString(),
  });
});

// routes
app.use("/api/products", productsRoutes);
app.use("/api/auth", authRoutes);

// ✅ Track Pricing (Price / Percent / Stock)
app.use("/api/alerts", alertsRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

module.exports = app;
