const mongoose = require("mongoose");

const BrowsingHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  history: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    viewedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("BrowsingHistory", BrowsingHistorySchema);
