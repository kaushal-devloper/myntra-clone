const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    paymentMode: {
      type: String,
      enum: ["UPI", "Card", "COD", "Wallet", "NetBanking", "Other"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Compound index for fast paginated user queries sorted by date
TransactionSchema.index({ userId: 1, createdAt: -1 });

// Index for filtering by paymentMode per user
TransactionSchema.index({ userId: 1, paymentMode: 1 });

// Index for filtering by paymentStatus per user
TransactionSchema.index({ userId: 1, paymentStatus: 1 });

module.exports =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
