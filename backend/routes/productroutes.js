const express = require("express");
const cetegory = require("../models/Cetegory");
const router = express.Router();
router.get("/getcetegory", async (req, res) => {
    try {
        const cetegories = await cetegory.find();
        res.status(200).json(cetegories);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
});
module.exports = router;