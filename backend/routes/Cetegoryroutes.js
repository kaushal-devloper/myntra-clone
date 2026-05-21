const express = require("express");
const product = require("../models/product");
const router = express.Router();
router.get("/getcetegory", async (req, res) => {
    try {
        const cetegories = await cetegory.find();
        res.status(200).json(products);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
});
router.get("/:id", async (req, res) => {
  const productid = parseInt(req.params.id);
  try {
    const product = await Product.findById(productid);
    res.status(200).json(product);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
module.exports = router;