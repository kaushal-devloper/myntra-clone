const Transaction = require("../models/Transaction");
const AuditLog = require("../models/AuditLog");
const Order = require("../modals/Order");
const fs = require("fs");
const path = require("path");
const { generateCSV, generateExcel, generatePDF } = require("../utils/exportGenerator");

/**
 * Helper: create an audit log entry for a transaction action.
 */
async function createAuditLog({ userId, action, entityId, changes, ip }) {
  try {
    await AuditLog.create({
      userId,
      action,
      entity: "Transaction",
      entityId,
      changes,
      performedBy: userId,
      ip: ip || null,
    });
  } catch (err) {
    // Audit log failure should not block main operation
    console.error("[AuditLog] Failed to write audit log:", err.message);
  }
}

/**
 * GET /api/transactions
 * List transactions for the authenticated user with pagination, filtering, sorting, and search.
 * Query params:
 *   page       (number, default 1)
 *   limit      (number, default 15, max 50)
 *   status     (pending|success|failed|refunded)
 *   mode       (UPI|Card|COD|Wallet|NetBanking|Other)
 *   sort       (date_desc|date_asc|amount_desc|amount_asc) default: date_desc
 *   search     (string, searches description)
 */
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { userId };
    if (req.query.status) {
      const validStatuses = ["pending", "success", "failed", "refunded"];
      if (validStatuses.includes(req.query.status)) {
        filter.paymentStatus = req.query.status;
      }
    }
    if (req.query.mode) {
      const validModes = ["UPI", "Card", "COD", "Wallet", "NetBanking", "Other"];
      if (validModes.includes(req.query.mode)) {
        filter.paymentMode = req.query.mode;
      }
    }
    if (req.query.search && req.query.search.trim()) {
      filter.description = {
        $regex: req.query.search.trim(),
        $options: "i",
      };
    }

    // Build sort
    const sortMap = {
      date_desc: { createdAt: -1 },
      date_asc: { createdAt: 1 },
      amount_desc: { amount: -1 },
      amount_asc: { amount: 1 },
    };
    const sortOption = sortMap[req.query.sort] || { createdAt: -1 };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort(sortOption).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (err) {
    console.error("[TransactionController] getTransactions error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch transactions." });
  }
};

/**
 * GET /api/transactions/:id
 * Get a single transaction by ID (ownership enforced).
 */
exports.getTransactionById = async (req, res) => {
  try {
    const userId = req.user.id;
    const transaction = await Transaction.findById(req.params.id).lean();

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }
    if (transaction.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    return res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    console.error("[TransactionController] getTransactionById error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch transaction." });
  }
};

/**
 * POST /api/transactions
 * Create a new transaction and auto-create audit log.
 */
exports.createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMode, paymentStatus, orderId, description, receiptUrl, metadata } =
      req.body;

    if (!amount || !paymentMode) {
      return res
        .status(400)
        .json({ success: false, message: "amount and paymentMode are required." });
    }

    const transaction = await Transaction.create({
      userId,
      amount,
      paymentMode,
      paymentStatus: paymentStatus || "pending",
      orderId: orderId || null,
      description: description || "",
      receiptUrl: receiptUrl || null,
      metadata: metadata || {},
    });

    // Auto audit log
    await createAuditLog({
      userId,
      action: "created",
      entityId: transaction._id,
      changes: transaction.toObject(),
      ip: req.ip,
    });

    return res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    console.error("[TransactionController] createTransaction error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to create transaction." });
  }
};

/**
 * PUT /api/transactions/:id
 * Update a transaction (ownership enforced) and auto-create audit log.
 */
exports.updateTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }
    if (transaction.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const allowedFields = ["paymentStatus", "description", "receiptUrl", "metadata", "amount"];
    const before = transaction.toObject();
    const changes = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        changes[field] = { from: transaction[field], to: req.body[field] };
        transaction[field] = req.body[field];
      }
    });

    await transaction.save();

    // Auto audit log
    await createAuditLog({
      userId,
      action: "updated",
      entityId: transaction._id,
      changes,
      ip: req.ip,
    });

    return res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    console.error("[TransactionController] updateTransaction error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to update transaction." });
  }
};

/**
 * POST /api/transactions/export
 * Generates an export file (PDF, CSV, Excel) of transactions matching the filters and returns download url.
 */
exports.exportTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const body = req.body || {};
    const query = req.query || {};
    const format = (body.format || query.format || "pdf").toLowerCase();

    if (!["pdf", "csv", "xlsx"].includes(format)) {
      return res.status(400).json({ success: false, message: "Invalid format. Supported formats are: pdf, csv, xlsx." });
    }

    // Build filter
    const filter = { userId };
    
    // Status filter
    const status = body.status || query.status;
    if (status && status !== "all") {
      const validStatuses = ["pending", "success", "failed", "refunded"];
      if (validStatuses.includes(status)) {
        filter.paymentStatus = status;
      }
    }

    // Mode filter
    const mode = body.mode || query.mode;
    if (mode && mode !== "all") {
      const validModes = ["UPI", "Card", "COD", "Wallet", "NetBanking", "Other"];
      if (validModes.includes(mode)) {
        filter.paymentMode = mode;
      }
    }

    // Date range filter
    const startDate = body.startDate || query.startDate;
    const endDate = body.endDate || query.endDate;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid startDate format. Use YYYY-MM-DD." });
        }
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid endDate format. Use YYYY-MM-DD." });
        }
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Search filter (text match on description or metadata)
    const search = body.search || query.search;
    if (search && search.trim()) {
      filter.description = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    // Build sort option
    const sort = body.sort || query.sort || "date_desc";
    const sortMap = {
      date_desc: { createdAt: -1 },
      date_asc: { createdAt: 1 },
      amount_desc: { amount: -1 },
      amount_asc: { amount: 1 },
    };
    const sortOption = sortMap[sort] || { createdAt: -1 };

    // Fetch transactions - populate Order model for ordered products
    // Cap at 5000 transactions to optimize performance
    const transactions = await Transaction.find(filter)
      .sort(sortOption)
      .limit(5000)
      .populate("orderId")
      .lean();

    // Calculate summary
    let totalTransactions = transactions.length;
    let totalSpent = 0;
    let successful = 0;
    let failed = 0;

    transactions.forEach(t => {
      if (t.paymentStatus === "success") {
        totalSpent += t.amount;
        successful++;
      } else {
        failed++;
      }
    });

    const summary = {
      totalTransactions,
      totalSpent,
      successful,
      failed
    };

    // Ensure exports directory exists in temp storage
    const os = require("os");
    const exportsDir = path.join(os.tmpdir(), "exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Self-cleaning: Delete files older than 1 hour to save disk space
    fs.readdir(exportsDir, (err, files) => {
      if (!err && files) {
        const now = Date.now();
        files.forEach(file => {
          const filePath = path.join(exportsDir, file);
          fs.stat(filePath, (err, stat) => {
            if (!err && stat && (now - stat.mtimeMs > 3600000)) { // 1 hour
              fs.unlink(filePath, () => {});
            }
          });
        });
      }
    });

    // Generate unique secure filename containing user ID
    const randomHex = Math.random().toString(36).substring(7);
    const filename = `transaction-export-${userId}-${Date.now()}-${randomHex}.${format}`;
    const filePath = path.join(exportsDir, filename);

    // Call corresponding generator
    if (format === "csv") {
      generateCSV(transactions, summary, filePath);
    } else if (format === "xlsx") {
      generateExcel(transactions, summary, filePath);
    } else {
      await generatePDF(transactions, summary, filePath);
    }

    // Secure URL that verifies auth before downloading
    // We add the query parameters to the downloadUrl so that if the file is missing from /tmp (e.g. on serverless Vercel),
    // the download endpoint can generate it on-the-fly.
    const queryParams = new URLSearchParams();
    queryParams.set("format", format);
    if (status) queryParams.set("status", status);
    if (mode) queryParams.set("mode", mode);
    if (sort) queryParams.set("sort", sort);
    if (search) queryParams.set("search", search);
    if (startDate) queryParams.set("startDate", startDate);
    if (endDate) queryParams.set("endDate", endDate);

    const downloadUrl = `/api/transactions/export/download/${filename}?${queryParams.toString()}`;

    // Write audit log for security & tracking
    await createAuditLog({
      userId,
      action: "exported",
      entityId: userId,
      changes: { format, filterCount: transactions.length },
      ip: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: "Export generated successfully.",
      downloadUrl,
      filename,
    });
  } catch (err) {
    console.error("[TransactionController] exportTransactions error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to generate export file." });
  }
};

/**
 * GET /api/transactions/export/download/:filename
 * Securely downloads the export file (checks user authentication and matching userId in filename).
 */
exports.downloadExportFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { filename } = req.params;

    // Strict validation to prevent directory traversal
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ success: false, message: "Invalid filename." });
    }

    // Verify ownership of the file by checking if filename contains the logged in userId
    if (!filename.includes(userId)) {
      return res.status(403).json({ success: false, message: "Access denied. You do not own this file." });
    }

    const os = require("os");
    const exportsDir = path.join(os.tmpdir(), "exports");
    const filePath = path.join(exportsDir, filename);

    // Parse format from filename
    const ext = path.extname(filename);
    const format = ext.replace(".", "").toLowerCase();

    if (!fs.existsSync(filePath)) {
      console.log(`File ${filename} not found in temp storage. Generating on-the-fly...`);
      
      // Build filter
      const filter = { userId };
      
      // Status filter
      const status = req.query.status;
      if (status && status !== "all") {
        const validStatuses = ["pending", "success", "failed", "refunded"];
        if (validStatuses.includes(status)) {
          filter.paymentStatus = status;
        }
      }

      // Mode filter
      const mode = req.query.mode;
      if (mode && mode !== "all") {
        const validModes = ["UPI", "Card", "COD", "Wallet", "NetBanking", "Other"];
        if (validModes.includes(mode)) {
          filter.paymentMode = mode;
        }
      }

      // Date range filter
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            filter.createdAt.$gte = start;
          }
        }
        if (endDate) {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
          }
        }
      }

      // Search filter
      const search = req.query.search;
      if (search && search.trim()) {
        filter.description = {
          $regex: search.trim(),
          $options: "i",
        };
      }

      // Build sort option
      const sort = req.query.sort || "date_desc";
      const sortMap = {
        date_desc: { createdAt: -1 },
        date_asc: { createdAt: 1 },
        amount_desc: { amount: -1 },
        amount_asc: { amount: 1 },
      };
      const sortOption = sortMap[sort] || { createdAt: -1 };

      const transactions = await Transaction.find(filter)
        .sort(sortOption)
        .limit(5000)
        .populate("orderId")
        .lean();

      // Calculate summary
      let totalTransactions = transactions.length;
      let totalSpent = 0;
      let successful = 0;
      let failed = 0;

      transactions.forEach(t => {
        if (t.paymentStatus === "success") {
          totalSpent += t.amount;
          successful++;
        } else {
          failed++;
        }
      });

      const summary = {
        totalTransactions,
        totalSpent,
        successful,
        failed
      };

      // Ensure exports folder exists
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      // Generate the file
      if (format === "csv") {
        generateCSV(transactions, summary, filePath);
      } else if (format === "xlsx") {
        generateExcel(transactions, summary, filePath);
      } else {
        await generatePDF(transactions, summary, filePath);
      }
    }

    // Determine readable file display name
    const downloadName = `Myntra_Transactions_${new Date().toISOString().split('T')[0]}${ext}`;

    // Write audit log for security & tracking
    await createAuditLog({
      userId,
      action: "downloaded",
      entityId: userId,
      changes: { filename },
      ip: req.ip,
    });

    return res.download(filePath, downloadName, (err) => {
      if (err) {
        console.error("[TransactionController] downloadExportFile callback error:", err.message);
      }
    });
  } catch (err) {
    console.error("[TransactionController] downloadExportFile error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to download export file." });
  }
};

/**
 * GET /api/transactions/summary
 * Fetch overall/filtered transaction summary statistics for the user.
 */
exports.getTransactionSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Build filter
    const filter = { userId };
    
    // Status filter
    if (req.query.status && req.query.status !== "all") {
      const validStatuses = ["pending", "success", "failed", "refunded"];
      if (validStatuses.includes(req.query.status)) {
        filter.paymentStatus = req.query.status;
      }
    }

    // Mode filter
    if (req.query.mode && req.query.mode !== "all") {
      const validModes = ["UPI", "Card", "COD", "Wallet", "NetBanking", "Other"];
      if (validModes.includes(req.query.mode)) {
        filter.paymentMode = req.query.mode;
      }
    }

    // Search filter
    if (req.query.search && req.query.search.trim()) {
      filter.description = {
        $regex: req.query.search.trim(),
        $options: "i",
      };
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        const start = new Date(req.query.startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid startDate format. Use YYYY-MM-DD." });
        }
        filter.createdAt.$gte = start;
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid endDate format. Use YYYY-MM-DD." });
        }
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const transactions = await Transaction.find(filter).lean();

    let totalTransactions = transactions.length;
    let totalSpent = 0;
    let successful = 0;
    let failed = 0;
    let refunded = 0;
    let pending = 0;

    transactions.forEach((t) => {
      if (t.paymentStatus === "success") {
        totalSpent += t.amount;
        successful++;
      } else if (t.paymentStatus === "failed") {
        failed++;
      } else if (t.paymentStatus === "refunded") {
        refunded++;
      } else if (t.paymentStatus === "pending") {
        pending++;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalTransactions,
        totalSpent,
        successful,
        failed,
        refunded,
        pending,
      },
    });
  } catch (err) {
    console.error("[TransactionController] getTransactionSummary error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch summary statistics." });
  }
};


