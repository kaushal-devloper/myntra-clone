const express = require("express");
const auth = require("../middleware/auth");
const {
  createOrder,
  getOrders,
  getOrderById,
  getReceipt,
  getReceiptPdf,
  getReceiptImage,
} = require("../controllers/orderController");

const router = express.Router();

// All routes require authentication
router.use(auth);

/** POST /api/orders — create an order (+ transaction + audit log) */
router.post("/", createOrder);

/** GET /api/orders — list the authenticated user's orders */
router.get("/", getOrders);

/** GET /api/orders/:id — single order details */
router.get("/:id", getOrderById);

/** GET /api/orders/:id/receipt — generate and return receipt HTML */
router.get("/:id/receipt", getReceipt);

/** GET /api/orders/:id/receipt/pdf — download PDF receipt */
router.get("/:id/receipt/pdf", getReceiptPdf);

/** GET /api/orders/:id/receipt/image — download SVG image receipt */
router.get("/:id/receipt/image", getReceiptImage);

module.exports = router;
