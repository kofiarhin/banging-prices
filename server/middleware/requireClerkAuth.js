const { getAuth } = require("@clerk/express");

const requireClerkAuth = (req, res, next) => {
  const auth = getAuth(req);

  if (!auth?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.userId = auth.userId;
  req.sessionId = auth.sessionId;

  next();
};

module.exports = requireClerkAuth;
