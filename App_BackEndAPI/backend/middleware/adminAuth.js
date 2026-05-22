import config from "../config/config.js";

export const adminAuth = (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice("Bearer ".length)
    : null;
  const adminKey = req.headers["x-admin-key"] || bearer || req.body?.adminPassword;

  if (!config.ADMIN || adminKey !== config.ADMIN) {
    return res.status(403).json({ error: "Unauthorized admin request." });
  }
  next();
};
