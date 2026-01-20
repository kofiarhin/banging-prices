const { Router } = require("express");
const { postSignup, postLogin } = require("../controllers/auth.controller");

const router = Router();

router.get("/", (req, res) => {
  return res.json({ message: "Auth route active" });
});

router.post("/post-signup", postSignup);
router.post("/post-login", postLogin);

module.exports = router;
