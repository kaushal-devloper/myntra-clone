const express = require("express");
const Product = require("../modals/Product");
const router = express.Router();

/**
 * GET /product
 * Postman Test:
 * 1. Open Postman
 * 2. Select 'GET' from the HTTP method dropdown
 * 3. Enter URL: http://localhost:5000/product
 * 4. Click 'Send' to see all products!
 */
router.get("/", async (req, res) => {
    try {
        const products = await Product.find().lean();
        res.status(200).json(products);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
});

/**
 * GET /product/:id
 * Postman Test:
 * 1. Open Postman
 * 2. Select 'GET'
 * 3. Enter URL: http://localhost:5000/product/<PRODUCT_ID>
 * 4. Click 'Send' to see details of a single product
 */
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).lean();
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.status(200).json(product);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
});

module.exports = router;