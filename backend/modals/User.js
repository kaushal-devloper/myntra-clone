const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  fullName: { type: String, trim: true, default: "" },
  mobile: { type: String, trim: true, default: "" },
  addressLine: { type: String, trim: true, default: "" },
  city: { type: String, trim: true, default: "" },
  state: { type: String, trim: true, default: "" },
  pincode: { type: String, trim: true, default: "" },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  pushTokens: {
    type: [String],
    default: [],
  },
  address: {
    type: AddressSchema,
    default: null,
  },
});

module.exports = mongoose.model("User", UserSchema);
