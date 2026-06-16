const express = require("express");
const auth = require("../middleware/auth");
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  exportTransactions,
  downloadExportFile,
  getTransactionSummary,
} = require("../controllers/transactionController");

const router = express.Router();

// All routes require authentication
router.use(auth);

/**
 * GET /api/transactions
 * List authenticated user's transactions with pagination, filter, sort, search.
 */
router.get("/", getTransactions);

/**
 * GET /api/transactions/summary
 * Get transaction summary statistics for analytics cards.
 */
router.get("/summary", getTransactionSummary);

/**
 * POST /api/transactions/export
 * Export transactions to PDF/CSV/Excel.
 */
router.post("/export", exportTransactions);

/**
 * GET /api/transactions/export/download/:filename
 * Securely download generated export files.
 */
router.get("/export/download/:filename", downloadExportFile);

/**
 * GET /api/transactions/:id
 * Get a single transaction by ID (ownership enforced).
 */
router.get("/:id", getTransactionById);


/**
 * POST /api/transactions
 * Create a new transaction for the authenticated user.
 */
router.post("/", createTransaction);

/**
 * PUT /api/transactions/:id
 * Update a transaction (ownership enforced).
 */
router.put("/:id", updateTransaction);

module.exports = router;

