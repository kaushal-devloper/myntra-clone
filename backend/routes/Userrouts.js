const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../modals/User");
const router = express.Router();

router.post("/signup", async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    const existinguser = await User.findOne({ email });
    if (existinguser)
      return res.status(400).json({ message: "User already exists" });
    const hashedpassword = await bcrypt.hash(password, 10);
    const user = new User({
      fullname: fullName,
      email,
      password: hashedpassword,
    });
    await user.save();
    const { password: _, ...userData } = user.toObject();
    res.status(201).json({ user: userData });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const ismatch = await bcrypt.compare(password, user.password);
    if (!ismatch) return res.status(401).json({ message: "Invalid password" });

    const { password: _, ...userData } = user.toObject();
    res.status(201).json({ user: userData });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// GET Wishlist for a user
router.get("/wishlist/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const Wishlist = require("../modals/Whishlist");
    const items = await Wishlist.find({ userId }).populate("productId");
    res.status(200).json(items);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching wishlist" });
  }
});

// ADD item to wishlist
router.post("/wishlist/add", async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const Wishlist = require("../modals/Whishlist");
    const exists = await Wishlist.findOne({ userId, productId });
    if (exists) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }
    const newItem = new Wishlist({ userId, productId });
    await newItem.save();
    res.status(201).json({ message: "Product added to wishlist", item: newItem });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error adding to wishlist" });
  }
});

// REMOVE item from wishlist
router.delete("/wishlist/remove", async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const Wishlist = require("../modals/Whishlist");
    await Wishlist.findOneAndDelete({ userId, productId });
    res.status(200).json({ message: "Product removed from wishlist" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error removing from wishlist" });
  }
});

module.exports = router;