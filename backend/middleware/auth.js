const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "myntra_secret_key";
const ADMIN_KEY = process.env.ADMIN_KEY || "myntra_admin_secret_key";

/**
 * Authentication middleware to protect API routes.
 * Supports JWT validation, and bypasses check if a valid x-admin-key is provided.
 */
module.exports = function (req, res, next) {
  // 1. Check if admin key is provided in headers for admin trigger panel/Postman testing
  const adminKey = req.header("x-admin-key");
  if (adminKey && adminKey === ADMIN_KEY) {
    req.isAdmin = true;
    return next();
  }

  // 2. Otherwise check for JWT Authorization header or query parameter
  const authHeader = req.header("Authorization");
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = authHeader;
    }
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access Denied: No authentication token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("[AuthMiddleware] Token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Access Denied: Invalid or expired authentication token.",
    });
  }
};
