const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { getAuth, clerkMiddleware } = require("@clerk/express");

const productsRoutes = require("./routes/products.routes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// setup middlewares
app.use(clerkMiddleware());
app.use(cors());
app.use(express.json());

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

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// // global error handler (must be last)
// app.use((err, req, res, next) => {
//   console.error("API ERROR:", err);

//   // handle common mongoose errors nicely
//   if (err.name === "ValidationError") {
//     return res.status(400).json({ success: false, message: err.message });
//   }

//   if (err.code === 11000) {
//     const field = Object.keys(err.keyValue || {})[0] || "field";
//     return res.status(409).json({
//       success: false,
//       message: `${field} already exists`,
//     });
//   }

//   return res.status(err.statusCode || err.status || 500).json({
//     success: false,
//     message: err.message || "Internal Server Error",
//   });
// });

module.exports = app;
