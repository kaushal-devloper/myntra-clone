const express = require("express");
const router = express.Router();
const { getBag, addToBag, updateQuantity, saveForLater, moveToBag, removeSavedItem, removeFromBag, clearBag } = require("../controllers/bagController");

// GET /api/bag/:userId
router.get("/:userId", getBag);

// POST /api/bag/add
router.post("/add", addToBag);

// POST /api/bag/update-quantity
router.post("/update-quantity", updateQuantity);

// POST /api/bag/save-for-later
router.post("/save-for-later", saveForLater);

// POST /api/bag/move-to-bag
router.post("/move-to-bag", moveToBag);

// POST /api/bag/remove-saved
router.post("/remove-saved", removeSavedItem);

// POST /api/bag/remove
router.post("/remove", removeFromBag);

// POST /api/bag/clear
router.post("/clear", clearBag);

module.exports = router;
