const express = require("express");
const Category = require("../modals/Category");
const router = express.Router();

/**
 * GET /category
 * Postman Test:
 * 1. Open Postman
 * 2. Select 'GET' from the HTTP method dropdown
 * 3. Enter URL: http://localhost:5000/category
 * 4. Click 'Send' to see all categories with populated product data!
 */
router.get("/", async (req, res) => {
    try {
        const categories = await Category.find().populate('productId');
        res.status(200).json(categories);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
});

module.exports = router;