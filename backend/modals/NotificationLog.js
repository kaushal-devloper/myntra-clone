const mongoose = require("mongoose");

const NotificationLogSchema = new mongoose.Schema(
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
    message: {
      type: String,
      index: true,
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
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "sent", "failed", "retry_pending", "delivered"],
      default: "pending",
      index: true,
    },
    tokensCount: {
      type: Number,
      default: 0,
    },
    tokens: {
      type: [String],
      default: [],
    },
    ticketIds: {
      type: [String],
      default: [],
    },
    errorLogs: {
      type: [String],
      default: [],
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to sync message and body fields
NotificationLogSchema.pre("validate", function () {
  if (this.body && !this.message) {
    this.message = this.body;
  } else if (this.message && !this.body) {
    this.body = this.message;
  }
});

// TTL index to automatically delete notification logs after 36 hours (129600 seconds)
NotificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 129600 });

module.exports = mongoose.model("NotificationLog", NotificationLogSchema);
