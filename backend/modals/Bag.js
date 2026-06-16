// Deprecated: Please use backend/models/Bag.js instead.
// Redirecting to backend/models/Bag.js to prevent OverwriteModelError and ensure single compilation.
const mongoose = require("mongoose");
module.exports = mongoose.models.Bag || require("../models/Bag");
