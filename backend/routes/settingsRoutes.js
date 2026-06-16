const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const settingsController = require("../controllers/settingsController");

// All settings routes are protected by auth middleware
router.use(auth);

// Password management
router.put("/change-password", settingsController.changePassword);

// Address management
router.get("/address", settingsController.getAddress);
router.put("/address", settingsController.updateAddress);

// Reset user data
router.post("/reset-data", settingsController.resetUserData);

module.exports = router;
