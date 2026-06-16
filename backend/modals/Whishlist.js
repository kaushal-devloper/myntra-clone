const mongoose = require("mongoose");

const WishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wishlist", WishlistSchema);