const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.Mixed, ref: "Product", default: null },
  name: { type: String, default: "" },
  brand: { type: String, default: "" },
  image: { type: String, default: "" },
  size: { type: String, default: "" },
  price: { type: Number, default: 0 },
  discountedPrice: { type: Number, default: 0 },
  discount: { type: String, default: "" },
  quantity: { type: Number, default: 1 },
});

const TimelineSchema = new mongoose.Schema({
  status: String,
  location: String,
  timestamp: String,
});

const TrackingSchema = new mongoose.Schema({
  number: String,
  carrier: String,
  estimatedDelivery: String,
  currentLocation: String,
  status: String,
  timeline: [TimelineSchema],
});

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    orderId: {
      type: String,
      unique: true,
      index: true,
    },
    date: String,
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "confirmed",
    },
    items: [OrderItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    total: { type: Number, required: true },
    shippingAddress: { type: String, default: "" },
    paymentMode: {
      type: String,
      enum: ["UPI", "Card", "COD", "Wallet", "NetBanking", "Other"],
      default: "COD",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "success",
    },
    receiptUrl: { type: String, default: null },
    tracking: TrackingSchema,
  },
  { timestamps: true }
);

// Generate human-readable orderId before save
OrderSchema.pre("save", function (next) {
  if (!this.orderId) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderId = `ORD-${ts}-${rand}`;
  }
  if (typeof next === "function") {
    next();
  }
});

// Compound index for user order listing
OrderSchema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.models?.Order || mongoose.model("Order", OrderSchema);