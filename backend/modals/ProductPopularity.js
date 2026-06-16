const mongoose = require("mongoose");

const ProductPopularitySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
  views: { type: Number, default: 0 },
  wishlistCount: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 },
  score: { type: Number, default: 0 } // Composite score
}, { timestamps: true });

ProductPopularitySchema.index({ score: -1, views: -1 });

module.exports = mongoose.model("ProductPopularity", ProductPopularitySchema);
