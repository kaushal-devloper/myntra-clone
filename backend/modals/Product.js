const mongoose = require("mongoose");
const ProductSchema = new mongoose.Schema(
  {
    name: String,
    brand: String,
    price: { type: Number, required: true },
    image: String,
    images: [String],
    stock: { type: Number, required: true },
    discontinued: { type: Boolean, default: false },
    sizes: [String],
    description: String,
    discount: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);