const mongoose = require("mongoose");

const NotificationJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    type: {
      type: String,
      required: true,
      enum: ["order_update", "payment_status", "delivery_alert", "cart_reminder", "promotional", "security_alert"],
      index: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["scheduled", "processing", "completed", "failed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    uniqueKey: {
      type: String,
      unique: true,
      sparse: true, // Allows null values for non-unique jobs
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NotificationJob", NotificationJobSchema);
