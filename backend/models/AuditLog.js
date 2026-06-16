const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["created", "updated", "deleted", "exported", "downloaded"],
      required: true,
    },
    entity: {
      type: String,
      required: true, // e.g. "Transaction"
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fast lookup by entity + entityId
AuditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

module.exports =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
