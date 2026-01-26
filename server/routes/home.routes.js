const express = require("express");
const {
  getHomeIntelligence,
  getNav,
} = require("../controllers/home.controller");

const router = express.Router();

router.get("/", getHomeIntelligence);
router.get("/nav", getNav);

module.exports = router;
