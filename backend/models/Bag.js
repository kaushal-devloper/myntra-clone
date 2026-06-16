const mongoose = require("mongoose");

const BagItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  size: {
    type: String,
    required: false,
  }
}, { _id: false });

const BagSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  activeItems: [BagItemSchema],
  savedItems: [BagItemSchema],
  version: {
    type: Number,
    default: 1,
  },
}, { timestamps: true });

module.exports = mongoose.models.Bag || mongoose.model("Bag", BagSchema);