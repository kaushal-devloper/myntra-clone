const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../modals/User");
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "myntra_secret_key";

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

    // Automatically create bag record
    const Bag = require("../models/Bag");
    await Bag.create({
      userId: user._id,
      activeItems: [],
      savedItems: [],
      version: 1
    }).catch(err => console.error("Error creating bag on signup:", err));

    const { password: _, ...userData } = user.toObject();
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({ user: userData, token });
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

    // Automatically initialize/check bag record
    const Bag = require("../models/Bag");
    const bagExists = await Bag.findOne({ userId: user._id });
    if (!bagExists) {
      await Bag.create({
        userId: user._id,
        activeItems: [],
        savedItems: [],
        version: 1
      }).catch(err => console.error("Error creating bag on login:", err));
    }

    const { password: _, ...userData } = user.toObject();
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });

    // Trigger security alert push notification
    try {
      const { sendPushNotification } = require("../services/notificationService");
      sendPushNotification(
        user._id,
        "Security Alert: New Login detected 🔒",
        `We noticed a new sign-in on your account at ${new Date().toLocaleTimeString()}. If this wasn't you, please secure your account.`,
        { notificationType: "security_alert" },
        "security_alert"
      ).catch(err => console.error("Error sending login security push notification:", err));
    } catch (e) {
      console.error("Failed to trigger security notification:", e);
    }

    res.status(201).json({ user: userData, token });
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

// GET Recently Viewed products
router.get("/recentlyViewed/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const RecentlyViewed = require("../modals/RecentlyViewed");
    const items = await RecentlyViewed.find({ userId })
      .sort({ viewedAt: -1 })
      .limit(20)
      .populate("productId");
    // Return array of populated products
    const products = items.map((item) => item.productId).filter(Boolean);
    res.status(200).json(products);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching recently viewed" });
  }
});

// ADD/UPDATE Recently Viewed product
router.post("/recentlyViewed/add", async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const RecentlyViewed = require("../modals/RecentlyViewed");

    // Create or update existing entry with new viewedAt time
    const item = await RecentlyViewed.findOneAndUpdate(
      { userId, productId },
      { viewedAt: Date.now() },
      { upsert: true, returnDocument: 'after' }
    );

    // Ensure we only keep the 20 most recent
    const allItems = await RecentlyViewed.find({ userId }).sort({ viewedAt: -1 });
    if (allItems.length > 20) {
      const idsToDelete = allItems.slice(20).map(i => i._id);
      await RecentlyViewed.deleteMany({ _id: { $in: idsToDelete } });
    }

    res.status(201).json({ message: "Product added to recently viewed", item });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error adding to recently viewed" });
  }
});

// CLEAR Recently Viewed products
router.delete("/recentlyViewed/clear/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const RecentlyViewed = require("../modals/RecentlyViewed");
    await RecentlyViewed.deleteMany({ userId });
    res.status(200).json({ message: "Recently viewed cleared" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error clearing recently viewed" });
  }
});

// REGISTER push token for a user
router.post("/push-token", async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ message: "userId and token are required" });
  }

  try {
    const mongoose = require("mongoose");
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    // 1. Remove this token from any other user who might have it (duplicate prevention)
    await User.updateMany(
      { _id: { $ne: userId }, pushTokens: token },
      { $pull: { pushTokens: token } }
    );

    // 2. Add the token to the target user (duplicate prevention within user)
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { pushTokens: token } },
      { returnDocument: 'after' }
    );

    res.status(200).json({ success: true, message: "Push token registered successfully" });
  } catch (error) {
    console.error("Error registering push token:", error);
    res.status(500).json({ message: "Error registering push token" });
  }
});

// SEND test push notification to a user's registered devices
router.post("/send-notification", async (req, res) => {
  const { userId, title, body, data } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ message: "userId, title, and body are required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.pushTokens || user.pushTokens.length === 0) {
      return res.status(400).json({ message: "No push tokens registered for this user" });
    }

    const messages = user.pushTokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: data || {},
    }));

    // Send to Expo push notification service
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Error sending push notification:", error);
    res.status(500).json({ message: "Error sending push notification" });
  }
});

module.exports = router;
