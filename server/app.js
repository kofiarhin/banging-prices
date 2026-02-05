const express = require("express");
const cors = require("cors");
const compression = require("compression");
const mongoose = require("mongoose");
const { clerkMiddleware } = require("@clerk/express");

const productsRoutes = require("./routes/products.routes");
const authRoutes = require("./routes/authRoutes");
const alertsRoutes = require("./routes/alerts.routes");
const collectionsRoutes = require("./routes/collections.routes");

// ✅ ADD THIS
const homeRoutes = require("./routes/home.routes");

const app = express();

// setup middlewares
app.use(clerkMiddleware());
app.use(cors());
app.use(compression());
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
app.use("/api/alerts", alertsRoutes);
app.use("/api/collections", collectionsRoutes);

// ✅ ADD THIS (public, no auth)
app.use("/api/home", homeRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

module.exports = app;
