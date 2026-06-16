const express = require("express");
const router = express.Router();
const { trackView, getRecommendations } = require("../controllers/recommendationController");

// POST /api/recommendations/track
router.post("/track", trackView);

// GET /api/recommendations/:userId
router.get("/:userId", getRecommendations);

// GET /api/recommendations/
router.get("/", getRecommendations); // for guest users

module.exports = router;
