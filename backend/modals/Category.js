const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: String,
    subcategory: [String],
    image: String,
    productId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

CategorySchema.index({ productId: 1 });

module.exports = mongoose.model("Category", CategorySchema);