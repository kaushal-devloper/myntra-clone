const mongoose = require("mongoose");

const PushTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    expoPushToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ["android", "ios", "web", "unknown"],
      default: "unknown",
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    appVersion: {
      type: String,
      default: "1.0.0",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find user device token combinations
PushTokenSchema.index({ userId: 1, deviceId: 1 });

module.exports = mongoose.model("PushToken", PushTokenSchema);
