const express = require("express");
const {
  getHomeIntelligence,
  getNav,
} = require("../controllers/home.controller");

const router = express.Router();

// GET /api/home
router.get("/", getHomeIntelligence);

// GET /api/home/nav
router.get("/nav", getNav);

module.exports = router;
