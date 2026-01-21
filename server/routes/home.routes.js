const express = require("express");
const { getHomeIntelligence } = require("../controllers/home.controller");

const router = express.Router();

// GET /api/home
router.get("/", getHomeIntelligence);

module.exports = router;
